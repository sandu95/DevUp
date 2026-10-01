# DevUp / MRSUTWEB --- Development Notes

## 1. Project overview

**Project name:** DevUp

**Theme:** Web platform with programming courses.

The platform is designed around: - public course catalog; - course
details and curriculum; - lessons; - quizzes associated with lessons; -
student enrollment; - learning progress; - user accounts; -
administration of courses, lessons and quizzes.

### Main user roles

-   `STUDENT` --- can browse published courses, enroll, access
    enrolled-course content, complete lessons and take quizzes.
-   `ADMIN` --- manages courses, lessons and quizzes and has access to
    administrative functionality.

------------------------------------------------------------------------

## 2. Technical stack

### Backend

-   Node.js
-   Express `5.2.1`
-   TypeScript `7.0.2`
-   Prisma `7.10.0`
-   PostgreSQL
-   `@prisma/adapter-pg`
-   `pg`
-   JWT (`jsonwebtoken`)
-   `bcryptjs`
-   CORS
-   `tsx`

### Automated testing

-   Vitest `5.0.3`
-   Supertest `7.3.0`
-   `@types/supertest`

### Frontend

The project uses React for the frontend.

------------------------------------------------------------------------

## 3. Backend structure

The backend is organized into several layers:

``` text
backend/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   ├── lib/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── server.ts
├── tests/
├── .env
├── .env.test
├── .env.example
├── package.json
└── package-lock.json
```

### Main backend layers

**Routes** - define API endpoints and middleware.

**Controllers** - validate requests; - check
authentication/authorization; - return HTTP responses; - call services.

**Services** - contain business logic; - communicate with
Prisma/database.

**Middleware** - JWT authentication; - role authorization; - optional
authentication for public endpoints.

------------------------------------------------------------------------

## 4. Authentication and authorization

Authentication uses JWT.

The token contains:

``` text
userId
role
```

Supported roles:

``` text
STUDENT
ADMIN
```

### Middleware

`authenticate` - requires a valid Bearer token; - returns `401` when the
token is missing, invalid or expired.

`authorize("ADMIN")` - restricts an endpoint to administrators; -
returns `403` for users without the required role.

`optionalAuthenticate` - allows public access when no token is
supplied; - if a valid token is supplied, the request receives
authenticated-user context.

------------------------------------------------------------------------

## 5. Course access model

The course API distinguishes between public users, students and
administrators.

### Public users

Visitors can access published course information and the public
curriculum.

### Students

Students see published courses and can access course content after
enrollment.

### Administrators

Administrators can access draft courses and perform course management
operations.

### Course modification rule

Published courses cannot be modified through the protected
administrative operations.

------------------------------------------------------------------------

## 6. Enrollment

Enrollment is associated with a user and course.

Main operations:

``` text
GET    /api/enrollments/me
POST   /api/enrollments/courses/:courseId
DELETE /api/enrollments/courses/:courseId
```

Important rules:

-   authentication is required;
-   a student cannot enroll twice in the same course;
-   enrollment is required for student access to course content;
-   enrollment data includes calculated course progress.

------------------------------------------------------------------------

## 7. Lessons

Main operations include:

``` text
GET    /api/lessons/course/:courseId
GET    /api/lessons/:id
POST   /api/lessons
PATCH  /api/lessons/:id
DELETE /api/lessons/:id
```

Important rules:

-   lesson administration is restricted to `ADMIN`;
-   students must be enrolled in the course to access protected lesson
    content;
-   invalid lesson IDs return `400`;
-   missing lessons return `404`;
-   unauthorized students receive `403`.

------------------------------------------------------------------------

## 8. Progress

Main endpoints:

``` text
GET  /api/progress/me
GET  /api/progress/courses/:courseId
POST /api/progress/lessons/:lessonId/complete
```

Course progress is calculated from:

``` text
completedLessons
totalLessons
percentage
```

The percentage is calculated as:

``` text
completedLessons / totalLessons × 100
```

rounded to the nearest integer.

### Lesson completion rule

A lesson without a quiz can be completed directly.

A lesson with a quiz cannot be manually completed.

The API returns `409` when an attempt is made to manually complete a
lesson that has a quiz.

A lesson containing a quiz becomes completed after the student achieves
`100%` on that quiz.

------------------------------------------------------------------------

## 9. Quiz system

Quiz functionality includes:

-   quiz creation;
-   question creation;
-   answer option creation;
-   question/option update;
-   question/option deletion;
-   student quiz access;
-   quiz submission;
-   quiz attempts;
-   lesson completion based on quiz score.

### Quiz submission flow

``` text
Student
   ↓
Authenticated request
   ↓
Enrollment check
   ↓
Validate submitted answers
   ↓
Calculate score
   ↓
Create QuizAttempt
   ↓
If score = 100%
   ↓
Mark lesson completed
```

### Important validation rules

The API rejects:

-   invalid quiz IDs;
-   missing/invalid answer arrays;
-   incomplete answers;
-   invalid question IDs;
-   answer options belonging to another question;
-   duplicate question answers.

The public API uses the response:

``` text
400
Invalid quiz answers
```

for invalid question/answer/duplicate-answer cases.

------------------------------------------------------------------------

## 10. Database

PostgreSQL is used as the main database.

Development database:

``` text
mrsutweb
```

Testing database:

``` text
mrsutweb_test
```

The test database is intentionally separated from the development
database.

Prisma migrations are used to keep the database schema synchronized with
the project.

------------------------------------------------------------------------

## 11. Environment configuration

The development environment uses `.env`.

Automated tests use `.env.test`.

Sensitive values must not be committed to GitHub.

The repository should contain `.env.example` with placeholder values
instead of real credentials.

Typical variables include:

``` text
DATABASE_URL
JWT_SECRET
```

------------------------------------------------------------------------

## 12. Automated testing

Automated backend testing was added using:

``` text
Vitest
Supertest
```

Tests run against the dedicated:

``` text
mrsutweb_test
```

database.

The current suite contains:

``` text
41 tests
41 passed
```

The tests cover the main backend areas:

-   authentication;
-   authorization;
-   courses;
-   enrollments;
-   lessons;
-   progress;
-   quizzes;
-   validation and error cases.

### Running all tests

``` powershell
npm test
```

### Running a specific test file

Example:

``` powershell
npm test quiz.api.test.ts
```

### Testing principle

Tests should be isolated whenever possible.

A test should create and clean up the data it needs instead of relying
on data created by another test.

This became important during implementation because some tests initially
reused the same lesson/course and therefore inherited state from
previous tests.

------------------------------------------------------------------------

## 13. Testing lessons learned

### Separate test database

Using a separate database prevents automated tests from modifying
development data.

### Test isolation

A test that expects no `LessonProgress` should use a lesson that has not
been completed by another test.

### API contract vs internal errors

The API may intentionally map multiple internal service errors to the
same public response.

For example:

``` text
INVALID_QUESTION
INVALID_ANSWER_OPTION
DUPLICATE_QUESTION
```

are exposed as:

``` text
400
Invalid quiz answers
```

Tests should verify the public API contract rather than
implementation-specific internal error messages.

### Mocking

Vitest module mocks are hoisted. Test mocks must therefore avoid
referencing top-level variables before they are initialized.

------------------------------------------------------------------------

## 14. Important API endpoints

### Authentication

``` text
POST /api/auth/register
POST /api/auth/login
```

### Courses

``` text
GET    /api/courses
GET    /api/courses/:id
GET    /api/courses/:id/curriculum
POST   /api/courses
PATCH  /api/courses/:id
DELETE /api/courses/:id
```

### Lessons

``` text
GET    /api/lessons/course/:courseId
GET    /api/lessons/:id
POST   /api/lessons
PATCH  /api/lessons/:id
DELETE /api/lessons/:id
```

### Enrollment

``` text
GET    /api/enrollments/me
POST   /api/enrollments/courses/:courseId
DELETE /api/enrollments/courses/:courseId
```

### Progress

``` text
GET  /api/progress/me
GET  /api/progress/courses/:courseId
POST /api/progress/lessons/:lessonId/complete
```

### Quizzes

``` text
GET    /api/quizzes/attempts/me
GET    /api/quizzes/lesson/:lessonId
GET    /api/quizzes/:id
GET    /api/quizzes/:id/admin
POST   /api/quizzes
POST   /api/quizzes/:quizId/questions
POST   /api/quizzes/questions/:questionId/options
POST   /api/quizzes/:id/submit
PATCH  /api/quizzes/questions/:questionId
DELETE /api/quizzes/questions/:questionId
PATCH  /api/quizzes/options/:optionId
DELETE /api/quizzes/options/:optionId
PATCH  /api/quizzes/:id
DELETE /api/quizzes/:id
```

------------------------------------------------------------------------

## 15. Git and GitHub

The project is maintained in Git.

Important project files that should be versioned include:

-   source code;
-   test files;
-   `package.json`;
-   `package-lock.json`;
-   Prisma schema;
-   Prisma migrations;
-   `.env.example`;
-   project documentation.

Sensitive files such as `.env` and `.env.test` should remain excluded
from Git.

Example commit for automated testing:

``` powershell
git add .
git commit -m "add automated backend tests"
git push
```

------------------------------------------------------------------------

## 16. Current project status

### Completed

-   backend foundation;
-   PostgreSQL database;
-   Prisma schema and migration;
-   JWT authentication;
-   role-based authorization;
-   public course catalog;
-   courses;
-   enrollments;
-   lessons;
-   quizzes;
-   quiz submission;
-   lesson progress;
-   course progress calculation;
-   automated backend testing;
-   41 passing automated tests;
-   Git/GitHub versioning.

### Current verification state

``` text
Automated tests: 41/41 passed
```

------------------------------------------------------------------------

## 17. Future development / remaining work

This section should be updated as the project evolves.

Potential areas to document when implemented:

-   frontend integration details;
-   dashboard behavior;
-   admin interface;
-   course/lesson management UI;
-   quiz management UI;
-   user profile functionality;
-   deployment configuration;
-   production environment configuration;
-   additional API and integration tests.

------------------------------------------------------------------------

## 18. Useful commands

### Development

``` powershell
npm run dev
```

### Build

``` powershell
npm run build
```

### Production start

``` powershell
npm start
```

### All tests

``` powershell
npm test
```

### Specific test file

``` powershell
npm test <test-file>.test.ts
```

### Prisma migration deployment

``` powershell
npx prisma migrate deploy
```

### Git status

``` powershell
git status
```

### Git push

``` powershell
git push
```

------------------------------------------------------------------------

## 19. Project decision log

The document should be updated whenever an important architectural or
business-rule decision is made.

Current decisions include:

1.  The platform is called **DevUp**.
2.  The course catalog is publicly accessible.
3.  Course/lesson learning content is protected by authentication and
    enrollment.
4.  `ADMIN` has management privileges.
5.  Students use quiz results to complete lessons that contain quizzes.
6.  A score of `100%` is required for automatic lesson completion.
7.  Automated tests use a separate PostgreSQL database.
8.  Automated tests use Vitest and Supertest.
9.  Tests are expected to be isolated and independent.
10. API tests validate the externally visible HTTP contract.
