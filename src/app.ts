import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import Database from "./config/db";
import EnvironmentConfig from "./config/env";
import routes from "./routes";
import googleRoutes from "./routes/googleRoutes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

class App {
  public app: Application;
  private envConfig = EnvironmentConfig.getInstance().config;

  constructor() {
    this.app = express();
    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    const database = Database.getInstance();
    await database.connect();
  }

  /**
   * Initialize middlewares
   */
  private initializeMiddlewares(): void {
    // Session configuration for Passport
    this.app.use(session({
      secret: EnvironmentConfig.getInstance().config.JWT_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));

    // Initialize Passport
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // CORS configuration (MUST be before helmet)
    this.app.use(
      cors({
        origin: "*", // In production, replace with your frontend URL
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // Security middleware with CORS-friendly settings
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      })
    );

    // Rate limiting
    // const limiter = rateLimit({
    //   windowMs: 15 * 60 * 1000, // 15 minutes
    //   max: this.envConfig.NODE_ENV === "production" ? 100 : 1000,
    //   message: {
    //     success: false,
    //     message: "Too many requests from this IP, please try again later.",
    //   },
    //   standardHeaders: true,
    //   legacyHeaders: false,
    // });
    // this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging middleware (development only)
    if (this.envConfig.NODE_ENV === "development") {
      this.app.use((req, res, next) => {
        console.log(
          `🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`
        );
        next();
      });
    }
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // API routes
    this.app.use("/api", routes);
    
    // Google OAuth routes
    this.app.use("/", googleRoutes);

    // Root endpoint
    this.app.get("/", (req, res) => {
      res.status(200).json({
        success: true,
        message: "🎉 Welcome to Banquet Booking System API",
        version: "1.0.0",
        documentation: "/api/docs",
        health: "/api/health",
        environment: this.envConfig.NODE_ENV,
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler (must be before error handler)
    this.app.use(notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public start(): void {
    const port = this.envConfig.PORT;

    this.app.listen(port, () => {
      console.log("\n🚀 =======================================");
      console.log("🎯 Banquet Booking API Server Running!");
      console.log(`📍 Environment: ${this.envConfig.NODE_ENV}`);
      console.log(`🌐 Port: ${port}`);
      console.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
      console.log(`💚 Health Check: http://localhost:${port}/api/health`);
      console.log("🚀 =======================================\n");
    });

    // Graceful shutdown handling
    process.on("SIGTERM", () => {
      console.log("🔴 SIGTERM received. Shutting down gracefully...");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("🔴 SIGINT received. Shutting down gracefully...");
      process.exit(0);
    });
  }
}

// Initialize the application
const app = new App();

// Only start the server if not in serverless environment (Vercel)
if (process.env.VERCEL !== "1" && !process.env.LAMBDA_TASK_ROOT) {
  app.start();
}

export default app;