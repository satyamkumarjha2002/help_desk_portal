import { faqService } from '../services/faqService';

// Sample FAQ documents to populate the knowledge base
const sampleDocuments = [
  {
    title: "Getting Started with Help Desk Portal",
    content: `Welcome to our Help Desk Portal! This comprehensive guide will help you navigate and use our system effectively.

**Creating Your First Ticket:**
1. Click on "New Ticket" in the navigation
2. Fill out the ticket form with detailed information
3. Select the appropriate department and priority
4. Add any relevant attachments
5. Submit your ticket

**Tracking Your Tickets:**
- View all your tickets in the "Tickets" section
- Check status updates and comments
- Receive notifications for important changes

**Getting Help:**
- Use this AI Assistant for instant answers
- Browse our knowledge base for detailed guides
- Contact support directly for complex issues

The system is designed to be intuitive and user-friendly. If you encounter any issues, don't hesitate to reach out!`,
    summary: "Complete guide to getting started with our Help Desk Portal system",
    tags: ["getting-started", "tutorial", "tickets", "basics"]
  },
  {
    title: "Ticket Priority Levels Explained",
    content: `Understanding ticket priorities helps ensure your issues get the appropriate attention and response time.

**Critical (P1):**
- System is completely down
- Security breach or data loss
- Revenue-impacting issues
- Response time: Within 1 hour

**High (P2):**
- Major functionality not working
- Affects multiple users
- Workaround not available
- Response time: Within 4 hours

**Medium (P3):**
- Minor functionality issues
- Affects single user or small group
- Workaround available
- Response time: Within 24 hours

**Low (P4):**
- Feature requests
- Cosmetic issues
- Documentation updates
- Response time: Within 72 hours

**Tips for Priority Selection:**
- Be honest about impact
- Consider business hours
- Provide clear descriptions
- Include error messages when applicable`,
    summary: "Guide to understanding and selecting appropriate ticket priority levels",
    tags: ["priorities", "tickets", "response-time", "classification"]
  },
  {
    title: "Account Management and Profile Settings",
    content: `Managing your account and profile settings is essential for a personalized experience.

**Profile Information:**
- Update your display name and contact information
- Add a profile picture for easy identification
- Set your department and role information
- Configure notification preferences

**Password and Security:**
- Change your password regularly
- Enable two-factor authentication when available
- Review your login history
- Log out from all devices if needed

**Notification Settings:**
- Choose how you want to be notified
- Set email notification preferences
- Configure in-app notification settings
- Manage notification frequency

**Department Settings:**
- View your assigned department
- Understand your role permissions
- See team members and structure
- Access department-specific resources

**Privacy Controls:**
- Control who can see your profile
- Manage data sharing preferences
- Review account activity
- Download your data if needed`,
    summary: "Complete guide to managing your account, profile, and privacy settings",
    tags: ["account", "profile", "settings", "privacy", "security"]
  },
  {
    title: "Troubleshooting Common Issues",
    content: `Here are solutions to the most common issues users encounter with our Help Desk Portal.

**Login Problems:**
- Clear your browser cache and cookies
- Try incognito/private browsing mode
- Check if Caps Lock is on
- Reset your password if necessary
- Contact admin if account is locked

**Page Loading Issues:**
- Check your internet connection
- Refresh the page (Ctrl+F5 or Cmd+R)
- Try a different browser
- Disable browser extensions temporarily
- Clear browser data

**File Upload Problems:**
- Check file size limits (max 10MB)
- Ensure file format is supported
- Try a different file format
- Check your internet connection
- Contact support for large files

**Notification Issues:**
- Check your notification settings
- Verify your email address
- Check spam/junk folders
- Ensure notifications are enabled in browser
- Update your contact information

**Performance Issues:**
- Close unnecessary browser tabs
- Clear browser cache
- Check system requirements
- Try during off-peak hours
- Report persistent issues to IT

**Mobile Access Problems:**
- Update your mobile browser
- Clear mobile browser cache
- Check mobile data/WiFi connection
- Try the desktop version
- Contact support for mobile app issues`,
    summary: "Solutions to common technical issues and troubleshooting steps",
    tags: ["troubleshooting", "common-issues", "login", "performance", "mobile"]
  },
  {
    title: "Department Structure and Contact Information",
    content: `Understanding our department structure helps you direct your tickets to the right team for faster resolution.

**IT Department:**
- Hardware and software support
- Network and connectivity issues
- Email and system access problems
- Security and backup concerns
- Contact: it-support@company.com
- Phone: ext. 1234

**Human Resources:**
- Employee onboarding and offboarding
- Policy questions and clarifications
- Benefits and payroll inquiries
- Training and development
- Contact: hr@company.com
- Phone: ext. 2345

**Finance Department:**
- Expense reports and reimbursements
- Budget questions
- Vendor and payment issues
- Financial system support
- Contact: finance@company.com
- Phone: ext. 3456

**Operations:**
- Facility and building issues
- Equipment requests
- Process improvements
- Vendor management
- Contact: operations@company.com
- Phone: ext. 4567

**General Support:**
- General questions
- Ticket routing assistance
- System navigation help
- Training requests
- Contact: support@company.com
- Phone: ext. 9999

**Emergency Contacts:**
- Security: ext. 911
- IT Emergency: ext. 1911
- Facilities Emergency: ext. 4911

Remember to include your department and employee ID when contacting support for faster service.`,
    summary: "Directory of departments, their responsibilities, and contact information",
    tags: ["departments", "contacts", "directory", "support", "phone-numbers"]
  },
  {
    title: "File Upload Guidelines and Best Practices",
    content: `Following proper file upload guidelines ensures your attachments are processed quickly and securely.

**Supported File Types:**
- Documents: PDF, DOC, DOCX, TXT, RTF
- Images: JPG, PNG, GIF, BMP, TIFF
- Spreadsheets: XLS, XLSX, CSV
- Presentations: PPT, PPTX
- Archives: ZIP, RAR, 7Z
- Code files: Most text-based formats

**File Size Limits:**
- Individual file: 10 MB maximum
- Total attachments per ticket: 50 MB
- Large files: Use cloud storage links instead
- Multiple files: Consider creating a ZIP archive

**Security Guidelines:**
- Scan files for viruses before uploading
- Don't include sensitive passwords in files
- Use encrypted files for confidential data
- Avoid executable files (.exe, .bat, .scr)

**Best Practices:**
- Use descriptive file names
- Include version numbers when relevant
- Compress large images to reduce size
- Create separate files for different topics
- Include file descriptions in ticket comments

**Naming Conventions:**
- Use clear, descriptive names
- Include dates: YYYY-MM-DD format
- Avoid special characters: / \\ : * ? " < > |
- Use underscores instead of spaces
- Keep names under 255 characters

**Common Upload Issues:**
- File too large: Compress or use cloud storage
- Unsupported format: Convert to supported type
- Upload timeout: Check internet connection
- Permission denied: Contact administrator
- Corrupted file: Try uploading again

**Cloud Storage Integration:**
- Google Drive: Share link with view permissions
- Dropbox: Create shared link
- OneDrive: Generate sharing link
- Include access instructions in ticket`,
    summary: "Guidelines and best practices for uploading files and attachments",
    tags: ["file-upload", "attachments", "guidelines", "security", "formats"]
  }
];

async function createTestData() {
  console.log('Creating test FAQ documents...');
  
  try {
    for (const doc of sampleDocuments) {
      console.log(`Creating document: ${doc.title}`);
      await faqService.createDocument(doc);
      console.log(`✓ Created: ${doc.title}`);
    }
    
    console.log('\n🎉 Successfully created all test documents!');
    console.log(`Total documents created: ${sampleDocuments.length}`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    console.log('\nMake sure:');
    console.log('1. Backend server is running');
    console.log('2. You are logged in as an admin user');
    console.log('3. Database is properly configured');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  createTestData();
}

export { createTestData, sampleDocuments }; 