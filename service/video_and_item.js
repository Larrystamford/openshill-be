const Item = require("../models/item");
const User = require("../models/user");
const BuySellItem = require("../models/buySellItem");
const Review = require("../models/review");
const Video = require("../models/video");
const { exec } = require("child_process");

const Fakerator = require("fakerator");
var fakerator = Fakerator("de-DE");

async function handleItemStock(userId, sellerId, quantity, itemId) {
  // update item stock
  console.log(userId, sellerId);
  let purchasedItem;
  try {
    // update item stock
    await Item.updateOne({ _id: itemId }, { $inc: { stocks: -quantity } });
    purchasedItem = await Item.find({ _id: itemId });
    if (purchasedItem[0].stocks < 0) {
      throw new Error("insufficient stock");
    }
  } catch (err) {
    // revert stock
    await Item.updateOne({ _id: itemId }, { $inc: { stocks: quantity } });

    console.log(err);
    return ["", err];
  }

  // get buyer info
  let buyerPostalCode, buyerAddress, buyerName, buyerEmail, deliveryCost;
  const buyer = await User.find({ _id: userId });
  buyerAddress = buyer[0].address;
  buyerEmail = buyer[0].email;
  buyerPostalCode = buyer[0].postalCode;
  buyerName = buyer[0].firstName + " " + buyer[0].lastName;
  // deliveryCost = quantity * 500;
  deliveryCost = 0;

  let totalPrice = Math.round(
    purchasedItem[0].price * quantity * 100 + deliveryCost
  );
  const newBuySellItem = new BuySellItem({
    name: purchasedItem[0].name,
    size: purchasedItem[0].size,
    color: purchasedItem[0].color,
    price: purchasedItem[0].price,
    quantity: quantity,
    image: purchasedItem[0].image,
    videoId: purchasedItem[0].video,
    itemId: itemId,
    deliveryCost: deliveryCost,
    totalPrice: totalPrice,
    buyerDeliveryStatus: "ordered",
    sellerDeliveryStatus: "ordered",
    buyerName: buyerName,
    buyerAddress: buyerAddress,
    buyerPostalCode: buyerPostalCode,
    buyerId: userId,
  });

  // update both users purchases and sales items
  let newItem;
  try {
    newItem = await newBuySellItem.save();
  } catch (err) {
    if (newItem && newItem._id) {
      await BuySellItem.findOneAndDelete({ _id: newItem._id });
    }
    return ["", err];
  }

  try {
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          purchases: newItem,
        },
      }
    );
  } catch (err) {
    await User.updateOne(
      { _id: userId },
      {
        $pull: {
          purchases: newItem,
        },
      }
    );
    return [newItem._id, err];
  }

  try {
    await User.updateOne(
      { _id: sellerId },
      {
        $push: {
          sales: newItem,
        },
      }
    );
  } catch (err) {
    await User.updateOne(
      { _id: sellerId },
      {
        $pull: {
          sales: newItem,
        },
      }
    );
    return [newItem._id, err];
  }

  return [newItem._id, null];
}

async function handleStocksRevert(
  userId,
  sellerId,
  quantity,
  itemId,
  newBuySellItemId
) {
  try {
    // revert stock
    await Item.updateOne({ _id: itemId }, { $inc: { stocks: quantity } });

    // delete the created buy sell item
    if (newBuySellItemId) {
      await BuySellItem.findOneAndDelete({ _id: newBuySellItemId });
    }

    // revert customer order
    await User.updateOne(
      { _id: userId },
      {
        $pull: {
          purchases: newBuySellItemId,
        },
      }
    );

    // revert seller order
    await User.updateOne(
      { _id: sellerId },
      {
        $pull: {
          sales: newBuySellItemId,
        },
      }
    );
  } catch (err) {
    return "revert failed" + err.toString();
  }
}

async function saveAmazonReviews(videoId, amazons) {
  try {
    let totalReviewsWanted = 12;
    let reviewsPerItems;

    if (amazons.length == 0) {
      reviewsPerItems = 12;
    } else if (amazons.length <= 4) {
      reviewsPerItems = Math.floor(totalReviewsWanted / amazons.length);
    } else {
      reviewsPerItems = 3;
    }

    for (const eachAmazon of amazons) {
      const ASINreg = new RegExp(/(?:\/)([A-Z0-9]{10})(?:$|\/|\?)/);
      let asin = eachAmazon.amazon_link.match(ASINreg);
      if (asin) {
        asin = asin[1];
      }

      if (asin) {
        // const reviews = await reviewsCrawler(asin);
        let reviewCount = 0;

        let newReview;
        for (const review of reviews.reviews) {
          if (review.rating > 1) {
            let fakeUserName = fakerator.names.name().split(" ")[0];
            while (fakeUserName.includes(".")) {
              fakeUserName = fakerator.names.name().split(" ")[0];
            }

            const randomSelectProfilePic = Math.floor(Math.random() * 8);
            const locoProfilePic = [
              "https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_1.png",
              "https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_2.png",
              "https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_3.png",
              "https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_4.png",
              "https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_5.png",
              "https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_6.png",
              "https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_7.png",
              "https://dciv99su0d7r5.cloudfront.net/profile_pic_loco_8.png",
            ];

            newReview = new Review({
              userName: fakeUserName,
              itemName: eachAmazon.amazon_name,
              userPicture: locoProfilePic[randomSelectProfilePic],
              videoId: videoId,
              rating: review.rating,
              text: review.text
                .replace("Your browser does not support HTML5 video.", "")
                .trim(),
            });

            await Video.findByIdAndUpdate(
              { _id: videoId },
              {
                $push: { reviews: newReview },
                $inc: { reviewCounts: 1, totalReviewRating: review.rating },
              }
            );
            await newReview.save();

            reviewCount += 1;

            if (reviewCount >= reviewsPerItems) {
              break;
            }
          }
        }
      }
    }
  } catch (error) {
    console.log("amazon error", error);
  }
}

async function saveTikTokVideo(
  key,
  value,
  userId,
  tiktokUsername,
  sharableLink = ""
) {
  try {
    const newVideo = new Video();
    newVideo.url = value.video.replace(
      "https://media2locoloco-us.s3.amazonaws.com/",
      "https://dciv99su0d7r5.cloudfront.net/"
    );
    newVideo.coverImageUrl = value.image.replace(
      "https://media2locoloco-us.s3.amazonaws.com/",
      "https://dciv99su0d7r5.cloudfront.net/"
    );
    newVideo.tiktokCoverImageUrl = value.tiktokImage;
    newVideo.tiktokCreatedAt = value.createTime;
    newVideo.caption = value.caption;
    newVideo.proShareCount = value.proShareCount;
    newVideo.mediaType = "video";
    newVideo.tiktokKey = key;
    newVideo.sharableLink = sharableLink;

    let user;
    try {
      user = await User.findById(userId);
    } catch (err) {
      console.log("saving tiktok error", err);
      throw err;
    }

    newVideo.user = user;
    newVideo.userName = user.userName;
    newVideo.originalCreator = tiktokUsername;

    // SAVING VIDEO
    try {
      await newVideo.save();
    } catch (err) {
      console.log("saving tiktok error", err);
      throw err;
    }

    // SAVING USER
    // add to set wont work because video id is new. But anyways currently we wont add duplicate if normal 3 calls.
    try {
      await User.findByIdAndUpdate(
        { _id: userId },
        { $addToSet: { videos: newVideo._id } }
      );
    } catch (err) {
      console.log("saving tiktok error", err);
      throw err;
    }

    return "success";
  } catch (error) {
    console.log("saving tiktok error", error);
    throw error;
  }
}

async function execInstallTTScrapper() {
  try {
    const res = await new Promise((resolve, reject) => {
      exec(`npm i tiktok-scraper`, (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          reject("");
        } else if (stderr) {
          console.log(`stderr: ${stderr}`);
          reject("");
        } else {
          resolve("success");
        }
      });
    });

    return res;
  } catch (err) {
    console.log("download tiktok by link error");
    return "error";
  }
}

async function execDownloadTikTokPromise(videoUrl, filePath) {
  try {
    const res = await new Promise((resolve, reject) => {
      exec(
        `tiktok-scraper --filepath ${filePath} video -d -w ${videoUrl}`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`);
            reject("");
          } else if (stderr) {
            console.log(`stderr: ${stderr}`);
            reject("");
          } else {
            resolve("success");
          }
        }
      );
    });

    return res;
  } catch (err) {
    console.log("download tiktok by link error");
    return "error";
  }
}

module.exports = {
  handleItemStock,
  handleStocksRevert,
  saveAmazonReviews,
  saveTikTokVideo,
  execDownloadTikTokPromise,
  execInstallTTScrapper,
};
