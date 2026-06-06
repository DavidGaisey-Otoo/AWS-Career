export const DEPLOY_SCENARIOS = [
  // 1. Worst-case CFN: wildcard IAM, public S3, open SG, hardcoded secret
  {
    id: 'disaster-cfn',
    name: 'Disaster CFN — every red flag',
    input: {
      template: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  DangerBucket:
    Type: AWS::S3::Bucket
    Properties:
      AccessControl: PublicRead
  DangerDb:
    Type: AWS::RDS::DBInstance
    Properties:
      MasterUsername: admin
      MasterUserPassword: "Hunter2Hunter2"
      Engine: mysql
  OpenSG:
    Type: AWS::EC2::SecurityGroup
    Properties:
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
  RootPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Effect: Allow
            Action: "*"
            Resource: "*"`,
      format: 'cfn',
    },
    expectedRules: [
      'DEPLOY-IAM-WILDCARD-001',
      'DEPLOY-S3-PUBLIC-001',
      'DEPLOY-S3-NO-PAB-001',
      'DEPLOY-SG-CRIT-PORT-001',
      'DEPLOY-SECRET-001',
      'DEPLOY-RDS-UNENCRYPTED-001',
      'DEPLOY-DELETION-POLICY-001',
    ],
  },

  // 2. NAT Gateway without VPC endpoints — expensive
  {
    id: 'nat-no-endpoints',
    name: 'NAT Gateway without VPC endpoints',
    input: {
      template: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  NatA:
    Type: AWS::EC2::NatGateway
    Properties:
      SubnetId: !Ref PublicSubnetA
  NatB:
    Type: AWS::EC2::NatGateway
    Properties:
      SubnetId: !Ref PublicSubnetB
  NatC:
    Type: AWS::EC2::NatGateway
    Properties:
      SubnetId: !Ref PublicSubnetC
  LambdaFn:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: nodejs20.x
      Handler: index.handler
  Tags:
    - Key: Project
      Value: Test`,
      format: 'cfn',
    },
    expectedRules: [
      'COST-NAT-NO-ENDPOINTS-001',
      'COST-NAT-MULTI-AZ-001',
    ],
  },

  // 3. Destructive CLI bundle
  {
    id: 'destructive-cli',
    name: 'CLI with destructive operations',
    input: {
      template: `#!/bin/bash
aws s3 rm s3://prod-bucket/ --recursive
aws rds delete-db-cluster --db-cluster-identifier my-prod-aurora
aws cloudformation delete-stack --stack-name prod-vpc`,
      format: 'cli',
    },
    expectedRules: [
      'DEPLOY-CLI-DESTRUCTIVE-001',
      'DEPLOY-CLI-DELETE-001',
    ],
  },

  // 4. Empty template
  {
    id: 'empty',
    name: 'Empty template',
    input: { template: '', format: 'cfn' },
    expectedRules: ['DEPLOY-EMPTY-001'],
  },

  // 5. Clean production template
  {
    id: 'clean-prod',
    name: 'Clean production template',
    input: {
      template: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ProdBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
    Properties:
      BucketName: !Sub '\${AWS::StackName}-data'
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms
      Tags:
        - Key: Project
          Value: AcmeCloud
        - Key: Environment
          Value: production
        - Key: Owner
          Value: platform-team
  ProdDb:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
    Properties:
      Engine: aurora-postgresql
      DBInstanceClass: db.r6g.large
      StorageEncrypted: true
      KmsKeyId: !Ref DbKmsKey
      MultiAZ: true
      MasterUsername: !Sub '{{resolve:secretsmanager:\${SecretArn}:SecretString:username}}'
      Tags:
        - Key: Project
          Value: AcmeCloud
  ProdBudget:
    Type: AWS::Budgets::Budget
    Properties:
      Budget:
        BudgetLimit:
          Amount: 5000
          Unit: USD
        TimeUnit: MONTHLY
        BudgetType: COST`,
      format: 'cfn',
    },
    expectedRules: [],
    expectMaxFindings: 2,
  },
];
