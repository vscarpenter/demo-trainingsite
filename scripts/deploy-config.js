#!/usr/bin/env node
// Deployment configuration and environment management
// Handles different deployment targets and environment validation

import { promises as fs } from 'fs';
import path from 'path';

const repoRoot = process.cwd();

// Default deployment configurations
const deploymentConfigs = {
  development: {
    name: 'Development',
    buildCommand: 'npm run build',
    optimizeCommand: 'node scripts/optimize-build.js',
    target: 'local',
    enableOptimization: false,
    enableCompression: false,
    cacheHeaders: {
      html: 'no-cache',
      assets: 'max-age=3600'
    }
  },
  staging: {
    name: 'Staging',
    buildCommand: 'npm run build',
    optimizeCommand: 'node scripts/optimize-build.js',
    target: 's3',
    bucket: process.env.STAGING_S3_BUCKET || 'staging-bucket',
    enableOptimization: true,
    enableCompression: true,
    cacheHeaders: {
      html: 'no-cache, no-store, must-revalidate',
      assets: 'public, max-age=86400'
    }
  },
  production: {
    name: 'Production',
    buildCommand: 'npm run build',
    optimizeCommand: 'node scripts/optimize-build.js',
    target: 's3',
    bucket: process.env.PROD_S3_BUCKET || 'm365copilot.sunit.dev',
    cloudfront: process.env.CLOUDFRONT_DISTRIBUTION_ID || 'E35I15ZTNNKA52',
    enableOptimization: true,
    enableCompression: true,
    cacheHeaders: {
      html: 'no-cache, no-store, must-revalidate',
      assets: 'public, max-age=31536000, immutable'
    }
  }
};

// Environment validation
const validateEnvironment = (env) => {
  const config = deploymentConfigs[env];
  if (!config) {
    throw new Error(`Unknown environment: ${env}. Available: ${Object.keys(deploymentConfigs).join(', ')}`);
  }
  
  const errors = [];
  
  // Check required environment variables
  if (config.target === 's3') {
    if (!process.env.AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID) {
      errors.push('AWS credentials not configured (AWS_PROFILE or AWS_ACCESS_KEY_ID required)');
    }
    
    if (!config.bucket) {
      errors.push(`S3 bucket not configured for ${env} environment`);
    }
  }
  
  // Check required commands exist
  const requiredCommands = ['npm', 'node'];
  if (config.target === 's3') {
    requiredCommands.push('aws');
  }
  
  // Note: We can't easily check command availability in this context
  // This would typically be done in the shell scripts
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map(e => `  • ${e}`).join('\n')}`);
  }
  
  return config;
};

// Generate deployment script
const generateDeployScript = (env) => {
  const config = validateEnvironment(env);
  
  let script = `#!/usr/bin/env bash
# Auto-generated deployment script for ${config.name}
# Generated on ${new Date().toISOString()}

set -euo pipefail

echo "🚀 Deploying to ${config.name} environment..."

# Build the application
echo "📦 Building application..."
${config.buildCommand}

`;

  if (config.enableOptimization) {
    script += `# Optimize build
echo "🔧 Optimizing build..."
${config.optimizeCommand}

`;
  }

  if (config.target === 's3') {
    script += `# Deploy to S3
echo "☁️  Deploying to S3..."
`;
    
    if (env === 'production') {
      script += `./deploySunit.sh
`;
    } else {
      script += `./deploy.sh ${config.bucket}
`;
    }
    
    if (config.cloudfront) {
      script += `
# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \\
  --distribution-id ${config.cloudfront} \\
  --paths "/*" \\
  --output text --query 'Invalidation.Id'
`;
    }
  } else {
    script += `# Local deployment
echo "📁 Build complete. Files available in dist/"
echo "💡 Run 'npm run preview' to test the build locally"
`;
  }

  script += `
echo "✅ Deployment to ${config.name} complete!"
`;

  return script;
};

// Create deployment scripts for all environments
const createDeploymentScripts = async () => {
  console.log('🔧 Creating deployment scripts...');
  
  for (const [env, config] of Object.entries(deploymentConfigs)) {
    const script = generateDeployScript(env);
    const scriptPath = path.join(repoRoot, `deploy-${env}.sh`);
    
    await fs.writeFile(scriptPath, script, 'utf8');
    
    // Make script executable (Unix systems)
    try {
      await fs.chmod(scriptPath, 0o755);
    } catch (error) {
      // Ignore chmod errors on Windows
    }
    
    console.log(`✅ Created ${path.relative(repoRoot, scriptPath)}`);
  }
};

// Generate environment info
const generateEnvInfo = async () => {
  const envInfo = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    environments: Object.keys(deploymentConfigs),
    configs: deploymentConfigs
  };
  
  const infoPath = path.join(repoRoot, 'deployment-info.json');
  await fs.writeFile(infoPath, JSON.stringify(envInfo, null, 2), 'utf8');
  console.log(`📋 Generated ${path.relative(repoRoot, infoPath)}`);
};

// Main function
const main = async () => {
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      await createDeploymentScripts();
      await generateEnvInfo();
      console.log('\n🎉 Deployment configuration complete!');
      console.log('📝 Available deployment scripts:');
      Object.keys(deploymentConfigs).forEach(env => {
        console.log(`   ./deploy-${env}.sh`);
      });
      break;
      
    case 'validate':
      const env = process.argv[3] || 'development';
      try {
        const config = validateEnvironment(env);
        console.log(`✅ Environment '${env}' is valid`);
        console.log(`📊 Configuration:`, JSON.stringify(config, null, 2));
      } catch (error) {
        console.error(`❌ ${error.message}`);
        process.exit(1);
      }
      break;
      
    case 'list':
      console.log('📋 Available environments:');
      Object.entries(deploymentConfigs).forEach(([env, config]) => {
        console.log(`   ${env}: ${config.name} (${config.target})`);
      });
      break;
      
    default:
      console.log('Usage: node scripts/deploy-config.js <command>');
      console.log('Commands:');
      console.log('  init     - Create deployment scripts for all environments');
      console.log('  validate - Validate environment configuration');
      console.log('  list     - List available environments');
      process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { deploymentConfigs, validateEnvironment, generateDeployScript };