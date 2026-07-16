# Acts Get Started Backend

## Features

- **Project User Registration**: Simplified user registration for project onboarding
- **RESTful API**: Clean API endpoints for frontend integration
- **Modern Stack**: Built with Laravel 11

## API Endpoints


### Project Onboarding
- `GET /api/get-started` - Register a project user (simplified registration without unique constraints)


## Tech Stack

- **Backend**: Laravel 11
- **Database**: SQLite (configurable)
- **Authentication**: Laravel Sanctum
- **Testing**: PHPUnit

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd acts-get-started-backend
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. **Database setup**
   ```bash
   php artisan migrate
   ```

6. **Build assets**
   ```bash
   npm run build
   ```

## Development

### Start the development server
```bash
php artisan serve
```

### Watch for asset changes
```bash
npm run dev
```

### Run tests
```bash
php artisan test
```

## Database Schema

### Users Table
- `id` - Primary key
- `name` - User's full name
- `email` - User's email (unique)
- `password` - Hashed password
- `timestamps` - Created/updated timestamps

### Project Users Table
- `id` - Primary key
- `name` - User's full name
- `email` - User's email (no unique constraint)
- `timestamps` - Created/updated timestamps

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
