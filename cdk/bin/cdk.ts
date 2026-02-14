#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { S3Stack } from '../lib/s3-stack';
import { RdsStack } from '../lib/rds-stack';
import { AuroraStack } from '../lib/aurora-stack';
import { Ec2Stack } from '../lib/ec2-stack';
import { EcsStack } from '../lib/ecs-stack';
import { CognitoStack } from '../lib/cognito-stack';

const app = new cdk.App();

// Environment configuration
const envName = app.node.tryGetContext('env') || 'dev';
const keyPairName = app.node.tryGetContext('keyPairName');
const moodleDomain = app.node.tryGetContext('moodleDomain') || 'localhost';
const awsRegion = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || 'ap-northeast-1';

// Common stack props
// Use environment-agnostic stacks when CDK_DEFAULT_ACCOUNT is not set
const env = process.env.CDK_DEFAULT_ACCOUNT
  ? {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: awsRegion,
    }
  : undefined;

const commonProps: cdk.StackProps = {
  env,
  tags: {
    Project: 'moodle-spa',
    Environment: envName,
    ManagedBy: 'cdk',
  },
};

// VPC Stack - Foundation for all resources
const vpcStack = new VpcStack(app, `${envName}-VpcStack`, {
  ...commonProps,
  envName,
});

// S3 Stack - Storage for frontend and Moodle files
const s3Stack = new S3Stack(app, `${envName}-S3Stack`, {
  ...commonProps,
  envName,
});

// Cognito Stack - Authentication for SPA and Moodle OAuth2
const cognitoStack = new CognitoStack(app, `${envName}-CognitoStack`, {
  ...commonProps,
  envName,
  moodleDomain,
});

// RDS Stack - MySQL for Moodle LMS
const rdsStack = new RdsStack(app, `${envName}-RdsStack`, {
  ...commonProps,
  envName,
  vpc: vpcStack.vpc,
});
rdsStack.addDependency(vpcStack);

// Aurora Stack - PostgreSQL with pgvector for AI features
const auroraStack = new AuroraStack(app, `${envName}-AuroraStack`, {
  ...commonProps,
  envName,
  vpc: vpcStack.vpc,
});
auroraStack.addDependency(vpcStack);

// EC2 Stack - Moodle LMS server
const ec2Stack = new Ec2Stack(app, `${envName}-Ec2Stack`, {
  ...commonProps,
  envName,
  vpc: vpcStack.vpc,
  moodleStorageBucket: s3Stack.moodleStorageBucket,
  keyPairName,
});
ec2Stack.addDependency(vpcStack);
ec2Stack.addDependency(s3Stack);

// ECS Stack - Fargate services (Frontend, BFF, API)
const ecsStack = new EcsStack(app, `${envName}-EcsStack`, {
  ...commonProps,
  envName,
  vpc: vpcStack.vpc,
  rdsSecret: rdsStack.dbSecret,
  auroraSecret: auroraStack.dbSecret,
});
ecsStack.addDependency(vpcStack);
ecsStack.addDependency(rdsStack);
ecsStack.addDependency(auroraStack);

app.synth();
