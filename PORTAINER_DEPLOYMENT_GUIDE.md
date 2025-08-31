# Portainer Deployment Guide for HyreFast Backend

## Prerequisites
1. Docker and Docker Compose installed on your server
2. Portainer running and accessible
3. MongoDB Atlas or cloud MongoDB instance
4. AWS account with S3 and SES configured
5. Razorpay account for payments

## Deployment Steps

### 1. Upload Files to Server
Upload the following files to your server:
- `docker-compose.yml`
- `Dockerfile`
- `package.json`
- All application source files
- `.dockerignore`

### 2. Create Stack in Portainer

1. Login to Portainer
2. Go to **Stacks** → **Add Stack**
3. Name: `hyrefast-backend`
4. Upload or paste the `docker-compose.yml` content

### 3. Set Environment Variables

In Portainer's stack deployment, add these environment variables:

```bash
# Required - MongoDB Connection
MONGODB_CONNECTION_STRING=mongodb+srv://username:password@your-cluster.mongodb.net/hyrefast?retryWrites=true&w=majority

# Required - Security Keys (Generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
SESSION_SECRET=your-super-secret-session-key-min-32-characters-long

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
AWS_SES_REGION=us-east-1
FROM_EMAIL=noreply@yourdomain.com

# AI Services (Pre-configured)
OLLAMA_TRANSCRIBE_URL=https://ollama.havenify.ai/transcribe
OLLAMA_API_URL=https://ollama2.havenify.ai/api/generate

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Optional - Defaults provided
NODE_ENV=production
PORT=5000
ALLOW_ORIGIN=*
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
BCRYPT_SALT_ROUNDS=12
```

### 4. Deploy Stack

1. Click **Deploy the stack**
2. Monitor the deployment in Portainer logs
3. The application will be available on port 5000

### 5. Verify Deployment

1. Check container logs in Portainer
2. Test health endpoint: `http://your-server:5000/health`
3. Verify MongoDB connection
4. Test API endpoints

## Networking

- The application runs on port 5000
- If using a reverse proxy (nginx/traefik), configure it to forward requests to the container
- For SSL termination, configure your reverse proxy accordingly

## Monitoring

- Use Portainer's built-in monitoring
- Check container health status
- Monitor logs for any errors
- Set up alerts for container failures

## Backup Strategy

- MongoDB: Use MongoDB Atlas automated backups
- Application data: Regular backups of S3 bucket
- Configuration: Keep environment variables documented

## Security Considerations

1. **Never expose port 5000 directly to the internet**
2. **Use a reverse proxy with SSL termination**
3. **Generate strong JWT and session secrets**
4. **Regularly rotate AWS keys**
5. **Enable MongoDB Atlas IP whitelisting**
6. **Monitor logs for suspicious activity**

## Troubleshooting

### Common Issues:

1. **Container fails to start**
   - Check environment variables are set correctly
   - Verify MongoDB connection string
   - Check container logs in Portainer

2. **Database connection fails**
   - Verify MongoDB Atlas allows connections from your server IP
   - Check connection string format
   - Ensure database user has proper permissions

3. **Health check fails**
   - Verify application is responding on port 5000
   - Check if all required environment variables are set
   - Review application startup logs

### Log Locations:
- Application logs: Available in Portainer container logs
- Error logs: Check Portainer stack logs section

## Updates and Maintenance

1. **To update the application:**
   - Update source code
   - Rebuild the stack in Portainer
   - Monitor deployment

2. **Regular maintenance:**
   - Update Docker images
   - Rotate secrets periodically
   - Monitor resource usage
   - Review security logs

## Support

For deployment issues:
1. Check Portainer logs
2. Verify all environment variables
3. Test MongoDB connectivity
4. Review this guide for missing steps
