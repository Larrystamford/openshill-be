const Feed = require("../models/feed");
const SeenVideos = require("../models/seenVideos");
const User = require("../models/user");

async function addVideoToFeed(videoId, categories) {
  try {
    let latestFeedId = await Feed.findOne().sort({ field: "asc", id: -1 });
    if (!latestFeedId) {
      latestFeedId = 0;
    } else {
      latestFeedId = latestFeedId.id;
    }

    // first feed starts with id: 1
    await Feed.updateOne(
      { id: latestFeedId, count: { $lt: 6 } },
      {
        $push: {
          videos: videoId,
          categories_list: categories,
        },
        $inc: { count: 1 },
        $setOnInsert: { id: latestFeedId + 1 },
      },
      { upsert: true }
    );

    latestFeedId = await Feed.findOne().sort({ field: "asc", id: -1 });
    latestFeedId = latestFeedId.id;

    return latestFeedId;
  } catch (err) {
    console.log(err.toString(), "error");
    return "adding video to feed collection failed" + err.toString();
  }
}

async function getPotentialFeed(userId, watchedFeedId) {
  if (watchedFeedId == 1) {
    return {
      id: 0,
      videos: [],
    };
  }

  let toWatchFeedId;

  if (!watchedFeedId) {
    // latest feed
    potentialFeed = await Feed.findOne()
      .sort({ field: "asc", id: -1 })
      .populate({
        path: "videos",
        populate: { path: "items" },
      })
      .populate({
        path: "videos",
        populate: { path: "comments", populate: { path: "replies" } },
      })
      .populate({
        path: "videos",
        populate: { path: "reviews" },
      });

    const potentialFeedCount = potentialFeed.count;
    toWatchFeedId = potentialFeed.id;
    if (userId) {
      // update latestFeedIdPerSession of user
      const latestFeedId = toWatchFeedId;
      await User.updateOne(
        { _id: userId },
        {
          latestFeedIdPerSession: latestFeedId,
        },
        { upsert: false }
      );

      let feedWatched = await SeenVideos.findOne({
        userId: userId,
        feedId: toWatchFeedId,
      });

      // all videos in the latest feed has been watched
      if (feedWatched && feedWatched.videos.length == potentialFeedCount) {
        // get next unseen feed
        toWatchFeedId = feedWatched.nextUnseenFeedId;
        console.log("next unseen", toWatchFeedId);
        if (toWatchFeedId == 0) {
          return {
            id: 0,
            videos: [],
          };
        }

        potentialFeed = await Feed.findOne({ id: toWatchFeedId })
          .populate({
            path: "videos",
            populate: { path: "items" },
          })
          .populate({
            path: "videos",
            populate: { path: "comments", populate: { path: "replies" } },
          })
          .populate({
            path: "videos",
            populate: { path: "reviews" },
          });

        // check and skip videos in "nextUnseenFeed"
        feedWatched = await SeenVideos.findOne({
          userId: userId,
          feedId: toWatchFeedId,
        });

        if (feedWatched) {
          const unwatchedVideos = potentialFeed.videos.filter(
            (potentialVideo) => {
              return !feedWatched.videos.includes(potentialVideo._id);
            }
          );

          potentialFeed.videos = unwatchedVideos;
        }
      } else if (feedWatched) {
        // still have remaining videos in the latest feed
        const unwatchedVideos = potentialFeed.videos.filter(
          (potentialVideo) => {
            return !feedWatched.videos.includes(potentialVideo._id);
          }
        );

        potentialFeed.videos = unwatchedVideos;
      }
    }
  } else {
    // subsequent feed after first feed loaded
    toWatchFeedId = watchedFeedId - 1;
    if (toWatchFeedId == 0) {
      return {
        id: 0,
        videos: [],
      };
    }

    potentialFeed = await Feed.findOne({ id: toWatchFeedId })
      .populate({
        path: "videos",
        populate: { path: "items" },
      })
      .populate({
        path: "videos",
        populate: { path: "comments", populate: { path: "replies" } },
      })
      .populate({
        path: "videos",
        populate: { path: "reviews" },
      });

    const potentialFeedCount = potentialFeed.count;

    if (userId) {
      let feedWatched = await SeenVideos.findOne({
        userId: userId,
        feedId: toWatchFeedId,
      });

      if (feedWatched && feedWatched.videos.length == potentialFeedCount) {
        toWatchFeedId = feedWatched.nextUnseenFeedId;
        if (toWatchFeedId == 0) {
          return {
            id: 0,
            videos: [],
          };
        }

        potentialFeed = await Feed.findOne({ id: toWatchFeedId })
          .populate({
            path: "videos",
            populate: { path: "items" },
          })
          .populate({
            path: "videos",
            populate: { path: "comments", populate: { path: "replies" } },
          })
          .populate({
            path: "videos",
            populate: { path: "reviews" },
          });

        // check and skip videos in "nextUnseenFeed"
        feedWatched = await SeenVideos.findOne({
          userId: userId,
          feedId: toWatchFeedId,
        });

        if (feedWatched) {
          const unwatchedVideos = potentialFeed.videos.filter(
            (potentialVideo) => {
              return !feedWatched.videos.includes(potentialVideo._id);
            }
          );

          potentialFeed.videos = unwatchedVideos;
        }
      } else if (feedWatched) {
        const unwatchedVideos = potentialFeed.videos.filter(
          (potentialVideo) => {
            return !feedWatched.videos.includes(potentialVideo._id);
          }
        );

        potentialFeed.videos = unwatchedVideos;
      }
    }
  }

  return potentialFeed;
}

function filterVideosByCategory(potentialFeed, category) {
  const videosWithCategory = [];

  for (let i = 0; i < potentialFeed.videos.length; i++) {
    if (potentialFeed.videos[i].categories.includes(category.toLowerCase())) {
      videosWithCategory.push(potentialFeed.videos[i]);
    }
  }

  potentialFeed.videos = videosWithCategory;
  return potentialFeed;
}

module.exports = {
  addVideoToFeed,
  getPotentialFeed,
  filterVideosByCategory,
};
