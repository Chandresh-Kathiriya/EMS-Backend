const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,  
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET, 
});

const uploadFile = async (file, folderName, fileFor) => {
  // Get today's date and time dynamically
  const today = new Date();

  const dateOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const timeOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

  const time = today.toLocaleTimeString('en-IN', timeOptions);
  const date = today.toLocaleDateString('en-IN', dateOptions).split('/').reverse().join('-');

  try {
    const extension = path.extname(file.originalname);
    // Construct dynamic file name and folder path
    const fileName = `${file.originalname}-${fileFor}-${date}-${time}${extension}`; // create file name

    // Check if the file is an image or a raw file (like .csv)
    const resourceType = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].includes(extension.toLowerCase()) ? 'image' : 'raw';

    // Return a promise that resolves when the upload is done
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `${process.env.PROJECT_FOLDER_NAME}/${folderName}`,   // folder name
          public_id: fileName,  // filename with date and time
          resource_type: resourceType,  // Set resource type based on file extension
        },
        (error, result) => {
          if (error) {
            console.log(error, "ERROR IS HERE")
            reject('Error uploading to Cloudinary:', error);
            return;
          }
          resolve(result); // send all result 
        }
      ).end(file.buffer);  // End the upload stream with the file buffer
    });

  } catch (error) {
    console.log(error, 'error')
    throw error;  // Throw the error so that it can be handled in the caller
  }
};


const removeFile = async (fileName) => {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(fileName,
        function (error, result) {
          if (error) {
            reject('Error deleting file from Cloudinary:', error);
            return;
          } else if (result) {
            resolve(result)
          }
        });
    })
  } catch (error) {
    console.error('Error during file deletion:', error);
  }
}

module.exports = { uploadFile, removeFile };