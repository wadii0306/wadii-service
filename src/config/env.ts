import dotenv from "dotenv";

dotenv.config();

interface IEnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  BCRYPT_ROUNDS: number;
  FRONTEND_URL: string;
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL?: string;
}

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  public config: IEnvironmentConfig;

  private constructor() {
    this.config = {
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT: parseInt(process.env.PORT || "5000", 10),
      MONGO_URI:
        process.env.MONGO_URI || "mongodb://localhost:27017/banquet_booking",
      JWT_SECRET: process.env.JWT_SECRET || "your-super-secret-jwt-key",
      JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
      BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
      FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
        apiKey: process.env.CLOUDINARY_API_KEY || "",
        apiSecret: process.env.CLOUDINARY_API_SECRET || "",
      },
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
      GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || "",
    };
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }
}

export default EnvironmentConfig;
