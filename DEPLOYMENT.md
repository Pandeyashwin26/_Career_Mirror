# Career Mirror - Deployment Guide

This guide covers deploying the Career Mirror application to various platforms including Vercel, Railway, Render, Docker, and self-hosted environments.

## Prerequisites

Before deploying, ensure you have:

1. **Database**: A Neon PostgreSQL database (or compatible PostgreSQL database)
2. **Environment Variables**: Configured according to `.env.example`
3. **API Keys**: OpenAI API key (required), LinkedIn, O*NET, Pinecone keys (optional)
4. **Build Requirements**: Node.js 18+ and npm

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure required environment variables:
   - `DATABASE_URL`: Your Neon database connection string
   - `SESSION_SECRET`: A secure random string (minimum 32 characters)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NODE_ENV`: Set to `production` for deployment

3. Configure optional API integrations:
   - LinkedIn, O*NET, Pinecone, SMTP, Twilio credentials

## Deployment Options

### 1. Vercel (Recommended for Serverless)

**Pros**: Free tier, automatic SSL, global CDN, serverless functions
**Cons**: Serverless limitations, function timeouts

**Steps**:
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   npm run deploy:vercel
   ```
   Or use the Vercel dashboard to import from GitHub.

3. Configure environment variables in Vercel dashboard
4. The `vercel.json` file is already configured

**Important Notes**:
- Session storage uses memory store (not persistent across function calls)
- Consider upgrading to PostgreSQL sessions for production
- Function timeout is 30 seconds maximum

### 2. Railway (Recommended for Full-Stack Apps)

**Pros**: Persistent storage, database included, easy scaling, generous free tier
**Cons**: No free tier limitations may change

**Steps**:
1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login and initialize:
   ```bash
   railway login
   railway init
   ```

3. Add environment variables:
   ```bash
   railway variables set DATABASE_URL="your_neon_db_url"
   railway variables set SESSION_SECRET="your_session_secret"
   railway variables set OPENAI_API_KEY="your_openai_key"
   ```

4. Deploy:
   ```bash
   npm run deploy:railway
   ```

**Features**:
- Automatic database migrations
- Health checks configured
- Persistent file system

### 3. Render

**Pros**: Free tier, managed database, simple configuration
**Cons**: Spin down on free tier, slower cold starts

**Steps**:
1. Connect your GitHub repository to Render
2. Use the `render.yaml` blueprint for automatic setup
3. Or manually create a web service with:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node.js

**Configuration**:
- The `render.yaml` includes database setup
- Environment variables configured automatically
- Health checks enabled

### 4. Docker Deployment

**Pros**: Consistent environment, easy scaling, works anywhere
**Cons**: Requires Docker knowledge, infrastructure management

**Local Docker Testing**:
```bash
# Build the image
npm run docker:build

# Run with environment file
npm run docker:run

# Or use Docker Compose
npm run docker:up
```

**Production Docker**:
1. Build and push to container registry:
   ```bash
   docker build -t your-registry/career-mirror:latest .
   docker push your-registry/career-mirror:latest
   ```

2. Deploy to your container orchestration platform (Kubernetes, Docker Swarm, etc.)

### 5. Self-Hosted (VPS/Server)

**Pros**: Full control, persistent storage, cost-effective for scale
**Cons**: Manual setup, maintenance required

**Steps**:
1. Provision a Linux server (Ubuntu 20.04+ recommended)
2. Install Node.js 18+:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Clone and build:
   ```bash
   git clone https://github.com/your-username/career-mirror.git
   cd career-mirror
   npm install
   npm run build
   ```

4. Set up environment variables:
   ```bash
   sudo nano /etc/environment
   # Add your environment variables
   ```

5. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name career-mirror
   pm2 startup
   pm2 save
   ```

6. Set up reverse proxy with Nginx:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

## Database Migrations

For platforms that support it, migrations run automatically. For manual deployments:

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema changes (development)
npm run db:push
```

## Health Checks

All configurations include health checks at `/health` endpoint. This endpoint returns:
- Status: OK/Error
- Timestamp
- Environment info
- Database connection status

## Environment Variables Reference

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secure session secret (32+ characters)
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `NODE_ENV`: `production`
- `PORT`: Server port (usually set by platform)

### Optional Integrations
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`: LinkedIn OAuth
- `ONET_USERNAME`, `ONET_PASSWORD`: O*NET API credentials
- `PINECONE_API_KEY`, `PINECONE_INDEX`: Vector database
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`: Email notifications
- `TWILIO_*`: SMS notifications

## Scaling Considerations

### Database
- **Development**: Neon free tier
- **Production**: Neon Pro or dedicated PostgreSQL instance
- **High Scale**: Read replicas, connection pooling

### Application
- **Serverless**: Vercel, AWS Lambda
- **Container**: Railway, Render, Kubernetes
- **Traditional**: VPS with PM2, load balancers

### Caching
- **In-Memory**: Default (single instance)
- **Redis**: For multi-instance deployments
- **CDN**: Static assets via Vercel, Cloudflare

## Monitoring & Logging

### Health Monitoring
```bash
# Check application health
curl https://your-app.com/health
```

### Logs
- **Vercel**: Vercel dashboard
- **Railway**: Railway dashboard
- **Docker**: `docker logs container_name`
- **PM2**: `pm2 logs career-mirror`

### Error Tracking
Consider integrating:
- Sentry for error tracking
- LogRocket for user sessions
- New Relic for APM

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Session Security**: Use secure session secrets in production
3. **HTTPS**: All production deployments should use HTTPS
4. **CORS**: Configure CORS for your domain
5. **Rate Limiting**: Consider adding rate limiting for APIs
6. **Input Validation**: All user inputs are validated with Zod

## Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Database Connection**:
   - Verify DATABASE_URL format
   - Check firewall/network access
   - Ensure database is running

3. **Environment Variables**:
   - Verify all required vars are set
   - Check for typos in variable names
   - Ensure proper encoding for special characters

4. **Memory Issues**:
   - Increase platform memory limits
   - Optimize build process
   - Consider using lighter base images for Docker

### Platform-Specific Issues

**Vercel**:
- Function timeout: Optimize long-running operations
- Memory limit: Use Vercel Pro for higher limits
- File system: Read-only, use external storage for uploads

**Railway**:
- Build timeout: Optimize build process
- Memory usage: Monitor and upgrade plan if needed

**Docker**:
- Layer caching: Order Dockerfile for optimal caching
- Image size: Use multi-stage builds and Alpine images

## Support

For deployment issues:
1. Check platform documentation
2. Review logs for specific errors
3. Verify environment configuration
4. Test locally with production build

## Next Steps After Deployment

1. **Monitor**: Set up monitoring and alerts
2. **Scale**: Monitor usage and scale as needed  
3. **Backup**: Ensure database backups are configured
4. **Updates**: Plan for application updates and migrations
5. **Documentation**: Update team documentation with deployment specifics