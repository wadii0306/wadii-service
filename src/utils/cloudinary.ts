import { v2 as cloudinary } from "cloudinary";
import EnvironmentConfig from "../config/env";

const env = EnvironmentConfig.getInstance().config;

// Debug logs to check configuration
console.log("=== Cloudinary Debug ===");
console.log("Raw process.env.CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("Raw process.env.CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("Raw process.env.CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "***" : "Missing");
console.log("Cloudinary config:", env.cloudinary);
console.log("Cloud name:", env.cloudinary.cloudName);
console.log("API Key:", env.cloudinary.apiKey ? "Present" : "Missing");
console.log("API Secret:", env.cloudinary.apiSecret ? "Present" : "Missing");
console.log("=====================");

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export const uploadImage = async (
  filePath: string,
  folder: string
) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "image",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};


export default cloudinary;
