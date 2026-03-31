import { Transaction } from "../models/Transaction";
import { Booking } from "../models/Booking";
import { Types } from "mongoose";
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionQueryParams,
  TransactionSummary,
  PaymentMode,
  TransactionType,
} from "../types/transaction-types";

const oid = (id: string) => new Types.ObjectId(id);

export class TransactionService {
  /**
   * Create a new transaction and update booking payment status
   * Supports both customer payments (inbound) and vendor payments (outbound)
   */
  static async createTransaction(
    input: CreateTransactionInput
  ): Promise<any> {
    try {
      const {
        bookingId,
        amount,
        mode,
        status = "success",
        direction = "inbound",
        vendorId,
        vendorType,
        purchaseOrderId,
        createdBy,
      } = input;

      // Fetch the booking
      const booking = await Booking.findById(oid(bookingId));
      if (!booking) {
        throw new Error("Booking not found. Cannot create transaction for a deleted booking.");
      }

      // Handle inbound (customer) transactions
      if (direction === "inbound") {
        // Calculate total paid amount so far (only successful inbound transactions)
        const existingTransactions = await Transaction.find({
          bookingId: oid(bookingId),
          direction: "inbound",
          status: "success",
        });

        const totalPaid = existingTransactions.reduce(
          (sum, txn) => sum + txn.amount,
          0
        );

        const newTotalPaid = totalPaid + (status === "success" ? amount : 0);
        const totalAmount = booking.payment.totalAmount;

        // Determine transaction type
        let type: TransactionType;
        if (totalPaid === 0 && newTotalPaid < totalAmount) {
          type = "advance";
        } else if (newTotalPaid >= totalAmount) {
          type = "full";
        } else {
          type = "partial";
        }

        // Create transaction
        const transaction = await Transaction.create({
          bookingId: oid(bookingId),
          amount,
          mode,
          status,
          type: input.type || type,
          direction: "inbound",
          referenceId: input.referenceId,
          notes: input.notes,
          paidAt: input.paidAt || new Date(),
          createdBy: createdBy ? oid(createdBy) : undefined,
        });

        // Update booking payment status
        if (status === "success") {
          if (newTotalPaid >= totalAmount) {
            booking.payment.paymentStatus = "paid";
          } else if (newTotalPaid > 0) {
            booking.payment.paymentStatus = "partially_paid";
          } else {
            booking.payment.paymentStatus = "unpaid";
          }

          // Update advanceAmount for backwards compatibility
          booking.payment.advanceAmount = newTotalPaid;
          await booking.save();
        }

        return transaction;
      }

      // Handle outbound (vendor) transactions
      if (direction === "outbound") {
        if (!vendorType) {
          throw new Error(
            "vendorType is required for outbound transactions"
          );
        }

        // Create vendor payment transaction
        const transaction = await Transaction.create({
          bookingId: oid(bookingId),
          amount,
          mode,
          status,
          type: "vendor_payment",
          direction: "outbound",
          vendorId: vendorId ? oid(vendorId) : undefined,
          vendorType,
          purchaseOrderId: purchaseOrderId ? oid(purchaseOrderId) : undefined,
          referenceId: input.referenceId,
          notes: input.notes,
          paidAt: input.paidAt || new Date(),
          createdBy: createdBy ? oid(createdBy) : undefined,
        });

        // Update PO payment status if purchaseOrderId provided
        if (purchaseOrderId && status === "success") {
          const { PurchaseOrderService } = await import(
            "./purchaseOrderService"
          );
          await PurchaseOrderService.updatePOPaymentStatus(purchaseOrderId);
        }

        return transaction;
      }

      throw new Error("Invalid direction specified");
    } catch (error: any) {
      throw new Error(`Error creating transaction: ${error.message}`);
    }
  }

  /**
   * Get transactions with filtering (supports both inbound and outbound)
   */
  static async getTransactions(params: TransactionQueryParams): Promise<any> {
    try {
      const {
        bookingId,
        startDate,
        endDate,
        mode,
        status,
        type,
        direction,
        vendorId,
        vendorType,
        purchaseOrderId,
        minAmount,
        maxAmount,
        page = 1,
        limit = 50,
      } = params;

      // Build query
      const query: any = {};

      if (bookingId) {
        query.bookingId = oid(bookingId);
      }

      if (startDate || endDate) {
        query.paidAt = {};
        if (startDate) {
          query.paidAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.paidAt.$lte = new Date(endDate);
        }
      }

      if (mode) {
        query.mode = mode;
      }

      if (status) {
        query.status = status;
      }

      if (type) {
        query.type = type;
      }

      if (direction) {
        query.direction = direction;
      }

      if (vendorId) {
        query.vendorId = oid(vendorId);
      }

      if (vendorType) {
        query.vendorType = vendorType;
      }

      if (purchaseOrderId) {
        query.purchaseOrderId = oid(purchaseOrderId);
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        query.amount = {};
        if (minAmount !== undefined) {
          query.amount.$gte = minAmount;
        }
        if (maxAmount !== undefined) {
          query.amount.$lte = maxAmount;
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .populate("bookingId", "clientName contactNo email occasionType eventStartDateTime")
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments(query),
      ]);

      return {
        transactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      throw new Error(`Error fetching transactions: ${error.message}`);
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(transactionId: string): Promise<any> {
    try {
      const transaction = await Transaction.findById(oid(transactionId))
        .populate("bookingId")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .lean();

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      return transaction;
    } catch (error: any) {
      throw new Error(`Error fetching transaction: ${error.message}`);
    }
  }

  /**
   * Get booking details for a transaction
   */
  static async getBookingForTransaction(transactionId: string): Promise<any> {
    try {
      const transaction = await Transaction.findById(oid(transactionId));

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      const booking = await Booking.findById(transaction.bookingId).lean();

      if (!booking) {
        throw new Error("Booking not found");
      }

      return booking;
    } catch (error: any) {
      throw new Error(`Error fetching booking for transaction: ${error.message}`);
    }
  }

  /**
   * Update transaction
   */
  static async updateTransaction(
    transactionId: string,
    input: UpdateTransactionInput
  ): Promise<any> {
    try {
      const transaction = await Transaction.findById(oid(transactionId));

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Update fields
      if (input.amount !== undefined) transaction.amount = input.amount;
      if (input.mode) transaction.mode = input.mode;
      if (input.status) transaction.status = input.status;
      if (input.type) transaction.type = input.type;
      if (input.referenceId !== undefined) transaction.referenceId = input.referenceId;
      if (input.notes !== undefined) transaction.notes = input.notes;
      if (input.paidAt) transaction.paidAt = input.paidAt;
      if (input.updatedBy) transaction.updatedBy = oid(input.updatedBy);

      await transaction.save();

      // Recalculate booking payment status if status changed
      if (input.status || input.amount !== undefined) {
        await this.recalculateBookingPaymentStatus(
          transaction.bookingId.toString()
        );
      }

      return transaction;
    } catch (error: any) {
      throw new Error(`Error updating transaction: ${error.message}`);
    }
  }

  /**
   * Recalculate booking payment status based on successful transactions
   */
  static async recalculateBookingPaymentStatus(
    bookingId: string
  ): Promise<void> {
    try {
      const booking = await Booking.findById(oid(bookingId));
      if (!booking) {
        throw new Error("Booking not found");
      }

      // Calculate total paid from successful inbound transactions
      const transactions = await Transaction.find({
        bookingId: oid(bookingId),
        status: "success",
        direction: "inbound", // ONLY client payments should count towards booking totalPaid
      });

      const totalPaid = transactions.reduce((sum, txn) => sum + txn.amount, 0);
      const totalAmount = booking.payment.totalAmount;

      // Update payment status
      if (totalPaid >= totalAmount) {
        booking.payment.paymentStatus = "paid";
      } else if (totalPaid > 0) {
        booking.payment.paymentStatus = "partially_paid";
      } else {
        booking.payment.paymentStatus = "unpaid";
      }

      booking.payment.advanceAmount = totalPaid;
      await booking.save();
    } catch (error: any) {
      throw new Error(
        `Error recalculating booking payment status: ${error.message}`
      );
    }
  }

  /**
   * Get transaction summary for reports
   */
  static async getTransactionSummary(
    params: TransactionQueryParams
  ): Promise<TransactionSummary> {
    try {
      const { startDate, endDate, bookingId } = params;

      // Build match stage
      const matchStage: any = {};

      if (bookingId) {
        matchStage.bookingId = oid(bookingId);
      }

      if (startDate || endDate) {
        matchStage.paidAt = {};
        if (startDate) {
          matchStage.paidAt.$gte = new Date(startDate);
        }
        if (endDate) {
          matchStage.paidAt.$lte = new Date(endDate);
        }
      }

      // Aggregate summary
      const summary = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            successfulTransactions: {
              $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
            },
            failedTransactions: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
            totalSuccessfulAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "success"] }, "$amount", 0],
              },
            },
            advancePayments: {
              $sum: { $cond: [{ $eq: ["$type", "advance"] }, 1, 0] },
            },
            partialPayments: {
              $sum: { $cond: [{ $eq: ["$type", "partial"] }, 1, 0] },
            },
            fullPayments: {
              $sum: { $cond: [{ $eq: ["$type", "full"] }, 1, 0] },
            },
          },
        },
      ]);

      // Aggregate by payment mode
      const modeBreakdown = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$mode",
            count: { $sum: 1 },
            amount: {
              $sum: {
                $cond: [{ $eq: ["$status", "success"] }, "$amount", 0],
              },
            },
          },
        },
      ]);

      // Build payment mode summary
      const byPaymentMode: any = {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        upi: { count: 0, amount: 0 },
        bank_transfer: { count: 0, amount: 0 },
        cheque: { count: 0, amount: 0 },
        other: { count: 0, amount: 0 },
      };

      modeBreakdown.forEach((item) => {
        byPaymentMode[item._id as PaymentMode] = {
          count: item.count,
          amount: item.amount,
        };
      });

      const result = summary[0] || {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalSuccessfulAmount: 0,
        advancePayments: 0,
        partialPayments: 0,
        fullPayments: 0,
      };

      return {
        ...result,
        byPaymentMode,
      };
    } catch (error: any) {
      throw new Error(`Error generating transaction summary: ${error.message}`);
    }
  }

  /**
   * Get all transactions for a booking
   */
  static async getTransactionsByBooking(bookingId: string): Promise<any[]> {
    try {
      const transactions = await Transaction.find({
        bookingId: oid(bookingId),
      })
        .sort({ paidAt: 1, createdAt: 1 })
        .lean();

      return transactions;
    } catch (error: any) {
      throw new Error(`Error fetching transactions by booking: ${error.message}`);
    }
  }
}
