# User Registration API Flow

## Overview
The registration API handles user creation in both Firebase Authentication and PostgreSQL database, with optional profile image upload to Firebase Storage.

## API Endpoint
```
POST /auth/register
Content-Type: multipart/form-data
```

## Request Format

### Form Data Fields
- `email` (string, required): User's email address
- `password` (string, required): User's password (min 8 characters)
- `displayName` (string, required): User's full name (min 2 characters)
- `role` (string, optional): User role (defaults to `end_user`)
- `departmentId` (string, optional): UUID of user's department
- `profileImage` (file, optional): Profile image file (max 5MB, jpg/jpeg/png/gif/webp)

### Example Request
```javascript
const formData = new FormData();
formData.append('email', 'user@example.com');
formData.append('password', 'securePassword123');
formData.append('displayName', 'John Doe');
formData.append('role', 'end_user');
formData.append('profileImage', profileImageFile);

const response = await fetch('/auth/register', {
  method: 'POST',
  body: formData,
});
```

## Registration Flow

### Step 1: Input Validation
- Validates email format
- Ensures password is at least 8 characters
- Validates display name length (min 2 characters)
- Checks profile image size and format if provided

### Step 2: Check Existing User
- Queries PostgreSQL database for existing user with same email
- Returns `ConflictException` if user already exists

### Step 3: Create Firebase User
- Creates user in Firebase Authentication
- Sets display name and email verification status
- Generates unique Firebase UID

### Step 4: Upload Profile Image (Optional)
- If profile image provided, uploads to Firebase Storage
- Uses path format: `helpdeskUserProfile/{firebaseUid}.{extension}`
- Makes file publicly accessible
- Generates public download URL
- Updates Firebase Auth user with profile photo URL

### Step 5: Set Firebase Custom Claims
- Sets user role and permissions as custom claims
- Enables role-based access control in Firebase

### Step 6: Save to PostgreSQL
- Creates user record in local database
- Stores Firebase UID as linking field
- Saves profile picture URL and storage path
- Links to department if provided

## Response Format

### Success Response (201)
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "end_user",
      "isActive": true,
      "profilePictureUrl": "https://storage.googleapis.com/...",
      "departmentId": "department-uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "message": "Valid email is required",
  "statusCode": 400
}
```

#### User Already Exists (409)
```json
{
  "success": false,
  "message": "User with this email already exists",
  "statusCode": 409
}
```

#### Profile Image Error (400)
```json
{
  "success": false,
  "message": "Profile image must be smaller than 5MB",
  "statusCode": 400
}
```

## File Upload Specifications

### Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### File Size Limits
- Maximum: 5MB per image
- Recommended: Under 1MB for optimal performance

### Storage Path Format
```
Firebase Storage Path: helpdeskUserProfile/{firebaseUid}.{extension}
Public URL: https://storage.googleapis.com/{bucketName}/helpdeskUserProfile/{firebaseUid}.{extension}
```

## Error Handling

### Graceful Degradation
- If profile image upload fails, user registration continues
- User can upload profile image later via profile update API
- Logs error for debugging while maintaining user experience

### Rollback Considerations
- Firebase user creation is attempted first
- If database save fails, Firebase user remains (cleanup could be implemented)
- Consider implementing cleanup job for orphaned Firebase users

## Security Features

### Input Validation
- Email format validation
- Password strength requirements
- File type and size validation
- Role validation against enum values

### Firebase Security
- Custom claims for role-based access
- Secure file upload with proper permissions
- Email verification workflow (optional)

### Database Security
- UUID primary keys
- Prepared statements (TypeORM)
- Input sanitization

## Frontend Integration

### Form Requirements
```html
<form enctype="multipart/form-data">
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <input name="displayName" type="text" required />
  <input name="profileImage" type="file" accept="image/*" />
  <select name="role">
    <option value="end_user">End User</option>
    <!-- Admin-only options -->
  </select>
</form>
```

### JavaScript Example
```javascript
const registerUser = async (formData) => {
  try {
    const response = await api.post('/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Handle success
    console.log('User registered:', response.data.data.user);
  } catch (error) {
    // Handle error
    console.error('Registration failed:', error.response.data.message);
  }
};
```

## Testing

### Unit Tests Required
- Input validation tests
- File upload validation tests
- Error handling tests
- Firebase integration mocks
- Database integration tests

### Integration Tests
- End-to-end registration flow
- File upload scenarios
- Error scenarios
- Role assignment verification

### Manual Testing Checklist
- [ ] Registration with valid data
- [ ] Registration with profile image
- [ ] Registration without profile image
- [ ] Invalid email format
- [ ] Weak password
- [ ] Large image file (>5MB)
- [ ] Invalid image format
- [ ] Duplicate email registration
- [ ] Network failure scenarios 