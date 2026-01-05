#!/bin/bash

# AWS EKS & Kubernetes Integration Script
# This script helps deploy your application to AWS EKS

set -e

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="123456789012"  # Replace with your account ID
CLUSTER_NAME="eks-cluster"
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

echo "=========================================="
echo "AWS EKS Integration Script"
echo "=========================================="

# Step 1: Create ECR Repositories
echo "Step 1: Creating ECR repositories..."
aws ecr create-repository --repository-name aws-backend --region $AWS_REGION 2>/dev/null || echo "Backend repo already exists"
aws ecr create-repository --repository-name aws-frontend --region $AWS_REGION 2>/dev/null || echo "Frontend repo already exists"

# Step 2: Build and push images
echo "Step 2: Building and pushing Docker images..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

docker build -t aws-backend:latest backend/
docker tag aws-backend:latest $ECR_REGISTRY/aws-backend:latest
docker push $ECR_REGISTRY/aws-backend:latest

docker build -t aws-frontend:latest frontend/
docker tag aws-frontend:latest $ECR_REGISTRY/aws-frontend:latest
docker push $ECR_REGISTRY/aws-frontend:latest

# Step 3: Create EKS cluster (if not exists)
echo "Step 3: Checking EKS cluster..."
if ! aws eks describe-cluster --name $CLUSTER_NAME --region $AWS_REGION 2>/dev/null; then
  echo "Creating EKS cluster (this takes ~10-15 minutes)..."
  aws eks create-cluster \
    --name $CLUSTER_NAME \
    --version 1.27 \
    --roleArn arn:aws:iam::$AWS_ACCOUNT_ID:role/eks-service-role \
    --resourcesVpcConfig subnetIds=subnet-xxxxx,subnet-xxxxx \
    --region $AWS_REGION
fi

# Step 4: Update kubeconfig
echo "Step 4: Updating kubeconfig..."
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

# Step 5: Create node group (if not exists)
echo "Step 5: Checking node group..."
if ! aws eks describe-nodegroup --cluster-name $CLUSTER_NAME --nodegroup-name main-nodes --region $AWS_REGION 2>/dev/null; then
  echo "Creating node group..."
  aws eks create-nodegroup \
    --cluster-name $CLUSTER_NAME \
    --nodegroup-name main-nodes \
    --scaling-config minSize=2,maxSize=5,desiredSize=3 \
    --subnets subnet-xxxxx subnet-xxxxx \
    --node-role arn:aws:iam::$AWS_ACCOUNT_ID:role/eks-node-role \
    --region $AWS_REGION
fi

# Step 6: Deploy to Kubernetes
echo "Step 6: Deploying to Kubernetes..."
kubectl apply -f k8s/namespace-rbac.yaml
kubectl apply -f k8s/config-secret.yaml
kubectl apply -f k8s/mongo-secret.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-hpa.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/network-policy.yaml
kubectl apply -f k8s/ingress.yaml

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Check deployment status:"
echo "kubectl get deployments -n production"
echo "kubectl get pods -n production"
echo "kubectl get services -n production"
