const AWS = require('aws-sdk')
const fs = require('fs')
const util = require('util')
const readdir = util.promisify(fs.readdir)
const readfile = util.promisify(fs.readFile)
const User = require('../models/user')
const fetch = require('node-fetch')
const ogs = require('open-graph-scraper')
const rp = require('request-promise')
const cheerio = require('cheerio')

const path = require('path')
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(ffmpegPath)

const TikTokScraper = require('tiktok-scraper')
const del = require('del')

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
})

async function uploadFileToAws(file) {
  const fileName = `${new Date().getTime()}_${file.name}`
  const mimetype = file.mimetype

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: file.data,
    ContentType: mimetype,
  }
  if (process.env.NODE_ENV === 'dev') {
    params['ACL'] = 'public-read'
  }
  const res = await new Promise((resolve, reject) => {
    s3.upload(params, (err, data) =>
      err == null ? resolve(data) : reject(err),
    )
  })
  return { url: res.Location }
}

async function uploadFirstFrame(data, fileName, mimetype) {
  const fileNameFirstFrame = `${new Date().getTime()}_${fileName}`
  const paramsFirstFrame = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileNameFirstFrame,
    Body: data,
    ContentType: mimetype,
  }
  if (process.env.NODE_ENV === 'dev') {
    paramsFirstFrame['ACL'] = 'public-read'
  }
  const resFirstFrame = await new Promise((resolve, reject) => {
    s3.upload(paramsFirstFrame, (err, data) =>
      err == null ? resolve(data) : reject(err),
    )
  })

  return { url: resFirstFrame.Location }
}

async function readJsonInfo(folderPathName) {
  const filenames = await readdir(folderPathName)
  let jsonFileData
  let curFileExtension

  for (const filename of filenames) {
    curFileExtension = path.extname(filename)
    if (curFileExtension == '.json') {
      jsonFileData = await readfile(folderPathName + filename)
      break
    }
  }

  return jsonFileData
}

async function uploadByFolder(folderPathName, fileExtension) {
  const uploadedFiles = []
  const filenames = await readdir(folderPathName)
  let curFileExtension
  let fileData
  let res
  let params
  let jsonFileData

  console.log('number of downloaded videos')
  console.log(filenames.length)

  for (const filename of filenames) {
    curFileExtension = path.extname(filename)
    if (curFileExtension == fileExtension) {
      fileData = await readfile(folderPathName + filename)
      params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: filename,
        Body: fileData,
      }

      if (process.env.NODE_ENV === 'dev') {
        params['ACL'] = 'public-read'
      }
      res = new Promise((resolve, reject) => {
        s3.upload(params, (err, data) =>
          err == null ? resolve(data) : reject(err),
        )
      })

      uploadedFiles.push(res)
    }
  }

  return await Promise.all(uploadedFiles)
}

function ffmpegSync(uploadRes) {
  return new Promise((resolve, reject) => {
    ffmpeg(uploadRes.url)
      .screenshots({
        // Will take screens at 20%, 40%, 60% and 80% of the video
        filename: 'firstFrame.png',
        timestamps: [0.001],
        folder: './helpers/firstFrame/',
      })
      .on('end', async () => {
        console.log('Screenshot taken')
        resolve()
      })
  })
}

function screenshotTiktok(imageName, downloadToPath, videoFileLocation) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoFileLocation)
      .screenshots({
        // Will take screens at 20%, 40%, 60% and 80% of the video
        filename: imageName,
        timestamps: [0.001],
        folder: downloadToPath,
      })
      .on('end', async () => {
        console.log('Screenshot taken')
        resolve()
      })
  })
}

async function getTikTokJson(userId, defaultOptions) {
  try {
    let tiktokUsername
    const user = await User.findById(userId)
    for (const eachSocialAccount of user.socialAccounts) {
      if (eachSocialAccount.socialType == 'TikTok') {
        tiktokUsername = eachSocialAccount.userIdentifier
      }
    }

    if (fs.existsSync(`./tiktok-videos/${tiktokUsername}/`)) {
      await del(`./tiktok-videos/${tiktokUsername}/`)
    }
    if (fs.existsSync(`./tiktok-videos/${tiktokUsername + '-info'}/`)) {
      await del(`./tiktok-videos/${tiktokUsername + '-info'}/`)
    }

    const options = defaultOptions
    options.filetype = 'json'

    options.filepath = './tiktok-videos/' + tiktokUsername + '-info/'
    if (!fs.existsSync(options.filepath)) {
      fs.mkdirSync(options.filepath, { recursive: true })
    }

    options.download = false

    const tiktokJson = await TikTokScraper.user(tiktokUsername, defaultOptions)

    return 'success'
  } catch (e) {
    console.log(e)
    return 'failed'
  }
}

async function CdnLinktoS3Link(cdnLink, contentType = 'image/jpeg') {
  try {
    const file = await fetch(cdnLink)
    let res = await file.buffer()

    const fileName = `${new Date().getTime()}_${cdnLink}`

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: res,
      ContentType: contentType,
    }
    if (process.env.NODE_ENV === 'dev') {
      params['ACL'] = 'public-read'
    }

    res = await new Promise((resolve, reject) => {
      s3.upload(params, (err, data) =>
        err == null ? resolve(data) : reject(err),
      )
    })

    return res.Location.replace(
      'https://media2locoloco-us.s3.amazonaws.com/',
      'https://dciv99su0d7r5.cloudfront.net/',
    )
  } catch (err) {
    console.log(err)
    throw err
  }
}

async function getOpenGraphImage1(webLink) {
  try {
    const res = await new Promise((resolve, reject) => {
      rp({ url: webLink, followAllRedirects: true }, (err, res, body) => {
        try {
          // hard coded for shopee's universal-link
          let lastLink = res.request.uri.href
          let indexUniversalLink = lastLink.indexOf('/universal-link')
          if (indexUniversalLink > -1) {
            lastLink = lastLink.replace('/universal-link', '')
            rp(
              { url: lastLink, followAllRedirects: true },
              (err, res, body) => {
                let $ = cheerio.load(body)
                let post = {
                  og_img: $('meta[property="og:image"]').attr('content'),
                }

                if (!err) {
                  resolve(post.og_img)
                } else {
                  reject('error')
                }
              },
            )
          } else {
            // every other link

            let $ = cheerio.load(body)
            let post = {
              og_img: $('meta[property="og:image"]').attr('content'),
            }

            if (!err) {
              resolve(post.og_img)
            } else {
              reject('error')
            }
          }
        } catch {
          reject('error')
        }
      })
    })

    return res
  } catch (err) {
    console.log('open graph scrap error')
    return 'error'
  }
}

async function getOpenGraphImage2(webLink) {
  try {
    const res = await new Promise((resolve, reject) => {
      ogs({
        url: webLink,
        onlyGetOpenGraphInfo: true,
        allMedia: true,
        retry: 5,
        maxRedirects: 7,
      })
        .then((data) => {
          const { error, result, response } = data

          console.log(response)

          if (result.ogImage) {
            resolve(result.ogImage[0].url)
          } else {
            reject('')
          }
        })
        .catch((err) => {
          reject('error')
        })
    })

    return res
  } catch (err) {
    console.log('open graph scrap error')
    return 'error'
  }
}

module.exports = {
  uploadFileToAws,
  uploadFirstFrame,
  uploadByFolder,
  ffmpegSync,
  screenshotTiktok,
  readJsonInfo,
  getTikTokJson,
  CdnLinktoS3Link,
  getOpenGraphImage1,
  getOpenGraphImage2,
}
