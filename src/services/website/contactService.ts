import WebsiteContact from "../../models/website/Contact";
import { IWebsiteContact } from "../../types/website/contact.types";
import { 
  CreateWebsiteContactDTO, 
  UpdateWebsiteContactDTO, 
  WebsiteContactQueryFilters,
  ContactListResponse,
  ContactSubmissionResponse,
  WebsiteContactStats,
  ContactStatsResponse
} from "../../types/website/contact.types";

class ContactService {
  /**
   * Create a new contact submission from website form
   */
  async createContact(contactData: CreateWebsiteContactDTO): Promise<ContactSubmissionResponse> {
    try {
      // Check for duplicate contacts within last 30 days
      const existingContact = await (WebsiteContact as any).findDuplicate(
        contactData.email, 
        contactData.phone
      );

      if (existingContact) {
        return {
          success: false,
          message: "A contact submission with this email or phone number already exists within the last 30 days.",
          errors: ["Duplicate contact detected"]
        };
      }

      // Create new contact
      const newContact = new WebsiteContact({
        ...contactData,
        status: "new",
        priority: "medium"
      });

      const savedContact = await newContact.save();

      return {
        success: true,
        message: "Contact submission created successfully",
        data: savedContact
      };
    } catch (error) {
      console.error("Error creating contact:", error);
      return {
        success: false,
        message: "Failed to create contact submission",
        errors: [error instanceof Error ? error.message : "Unknown error occurred"]
      };
    }
  }

  /**
   * Get all contacts with filtering and pagination
   */
  async getContacts(filters: WebsiteContactQueryFilters): Promise<ContactListResponse> {
    try {
      const {
        status,
        priority,
        city,
        venueType,
        startDate,
        endDate,
        searchTerm,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc"
      } = filters;

      // Build query
      const query: any = {};

      // Add filters
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (city) query.city = new RegExp(city, "i");
      if (venueType) query.venueType = venueType;

      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Search term filter (search in fullName, email, banquetName, phone)
      if (searchTerm) {
        query.$or = [
          { fullName: new RegExp(searchTerm, "i") },
          { email: new RegExp(searchTerm, "i") },
          { banquetName: new RegExp(searchTerm, "i") },
          { phone: new RegExp(searchTerm, "i") }
        ];
      }

      // Sort options
      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Pagination
      const skip = (page - 1) * limit;

      // Execute query
      const [contacts, total] = await Promise.all([
        WebsiteContact.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        WebsiteContact.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: "Contacts retrieved successfully",
        data: {
          contacts,
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      console.error("Error getting contacts:", error);
      return {
        success: false,
        message: "Failed to retrieve contacts",
        data: {
          contacts: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0
        }
      };
    }
  }

  /**
   * Get a single contact by ID
   */
  async getContactById(id: string): Promise<ContactSubmissionResponse> {
    try {
      const contact = await WebsiteContact.findById(id);
      
      if (!contact) {
        return {
          success: false,
          message: "Contact not found",
          errors: ["Contact with the specified ID does not exist"]
        };
      }

      return {
        success: true,
        message: "Contact retrieved successfully",
        data: contact
      };
    } catch (error) {
      console.error("Error getting contact by ID:", error);
      return {
        success: false,
        message: "Failed to retrieve contact",
        errors: [error instanceof Error ? error.message : "Unknown error occurred"]
      };
    }
  }

  /**
   * Update a contact (admin use)
   */
  async updateContact(id: string, updateData: UpdateWebsiteContactDTO): Promise<ContactSubmissionResponse> {
    try {
      // Handle adminNotes separately to set timestamps
      const { adminNotes, ...otherUpdateData } = updateData;

      // Prepare update object
      const updateObject: any = { ...otherUpdateData };

      // If adminNotes are provided, set them with proper timestamps
      if (adminNotes) {
        updateObject.adminNotes = adminNotes.map(note => ({
          ...note,
          createdAt: note.createdAt || new Date(),
          updatedAt: new Date()
        }));
      }

      const updatedContact = await WebsiteContact.findByIdAndUpdate(
        id,
        updateObject,
        { new: true, runValidators: true }
      );

      if (!updatedContact) {
        return {
          success: false,
          message: "Contact not found",
          errors: ["Contact with the specified ID does not exist"]
        };
      }

      return {
        success: true,
        message: "Contact updated successfully",
        data: updatedContact
      };
    } catch (error) {
      console.error("Error updating contact:", error);
      return {
        success: false,
        message: "Failed to update contact",
        errors: [error instanceof Error ? error.message : "Unknown error occurred"]
      };
    }
  }

  /**
   * Add a new admin note to a contact
   */
  async addAdminNote(contactId: string, note: string): Promise<ContactSubmissionResponse> {
    try {
      const newNote = {
        note,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedContact = await WebsiteContact.findByIdAndUpdate(
        contactId,
        { 
          $push: { adminNotes: newNote }
        },
        { new: true, runValidators: true }
      );

      if (!updatedContact) {
        return {
          success: false,
          message: "Contact not found",
          errors: ["Contact with the specified ID does not exist"]
        };
      }

      return {
        success: true,
        message: "Admin note added successfully",
        data: updatedContact
      };
    } catch (error) {
      console.error("Error adding admin note:", error);
      return {
        success: false,
        message: "Failed to add admin note",
        errors: [error instanceof Error ? error.message : "Unknown error occurred"]
      };
    }
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string): Promise<ContactSubmissionResponse> {
    try {
      const deletedContact = await WebsiteContact.findByIdAndDelete(id);

      if (!deletedContact) {
        return {
          success: false,
          message: "Contact not found",
          errors: ["Contact with the specified ID does not exist"]
        };
      }

      return {
        success: true,
        message: "Contact deleted successfully",
        data: deletedContact
      };
    } catch (error) {
      console.error("Error deleting contact:", error);
      return {
        success: false,
        message: "Failed to delete contact",
        errors: [error instanceof Error ? error.message : "Unknown error occurred"]
      };
    }
  }

  /**
   * Get contact statistics for dashboard
   */
  async getContactStats(): Promise<ContactStatsResponse> {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        total,
        newContacts,
        contacted,
        converted,
        closed,
        thisMonthContacts,
        lastMonthContacts
      ] = await Promise.all([
        WebsiteContact.countDocuments(),
        WebsiteContact.countDocuments({ status: "new" }),
        WebsiteContact.countDocuments({ status: "contacted" }),
        WebsiteContact.countDocuments({ status: "converted" }),
        WebsiteContact.countDocuments({ status: "closed" }),
        WebsiteContact.countDocuments({ createdAt: { $gte: thisMonthStart } }),
        WebsiteContact.countDocuments({ 
          createdAt: { 
            $gte: lastMonthStart, 
            $lte: lastMonthEnd 
          } 
        })
      ]);

      const stats: WebsiteContactStats = {
        total,
        new: newContacts,
        contacted,
        converted,
        closed,
        thisMonth: thisMonthContacts,
        lastMonth: lastMonthContacts
      };

      return {
        success: true,
        message: "Contact statistics retrieved successfully",
        data: stats
      };
    } catch (error) {
      console.error("Error getting contact stats:", error);
      return {
        success: false,
        message: "Failed to retrieve contact statistics",
        data: {
          total: 0,
          new: 0,
          contacted: 0,
          converted: 0,
          closed: 0,
          thisMonth: 0,
          lastMonth: 0
        }
      };
    }
  }
}

export default new ContactService();