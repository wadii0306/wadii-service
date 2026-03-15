import dotenv from "dotenv";

dotenv.config();

interface IEnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  BCRYPT_ROUNDS: number;
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
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
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
        apiKey: process.env.CLOUDINARY_API_KEY || "",
        apiSecret: process.env.CLOUDINARY_API_SECRET || "",
      },
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
