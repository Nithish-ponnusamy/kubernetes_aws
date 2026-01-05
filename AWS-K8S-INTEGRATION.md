# AWS & Kubernetes Integration Guide

## Prerequisites

- AWS Account with permissions for EKS, ECR, IAM
- AWS CLI configured (`aws configure`)
- kubectl installed
- Docker installed
- Helm (optional, for advanced deployments)

## Step-by-Step Integration

### 1. **Create AWS IAM Roles**

```bash
# Service role for EKS
aws iam create-role \
  --role-name eks-service-role \
  --assume-role-policy-document file://trust-policy.json

# Node role for worker nodes
aws iam create-role \
  --role-name eks-node-role \
  --assume-role-policy-document file://node-trust-policy.json
```

### 2. **Create ECR Repositories**

```bash
aws ecr create-repository --repository-name aws-backend --region us-east-1
aws ecr create-repository --repository-name aws-frontend --region us-east-1
```

### 3. **Build & Push Docker Images**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
docker build -t aws-backend:latest backend/
docker tag aws-backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/aws-backend:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/aws-backend:latest

# Build and push frontend
docker build -t aws-frontend:latest frontend/
docker tag aws-frontend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/aws-frontend:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/aws-frontend:latest
```

### 4. **Create EKS Cluster**

```bash
aws eks create-cluster \
  --name eks-cluster \
  --version 1.27 \
  --roleArn arn:aws:iam::123456789012:role/eks-service-role \
  --resourcesVpcConfig subnetIds=subnet-xxxxx,subnet-xxxxx \
  --region us-east-1
```

### 5. **Create Node Group**

```bash
aws eks create-nodegroup \
  --cluster-name eks-cluster \
  --nodegroup-name main-nodes \
  --scaling-config minSize=2,maxSize=5,desiredSize=3 \
  --subnets subnet-xxxxx subnet-xxxxx \
  --node-role arn:aws:iam::123456789012:role/eks-node-role \
  --region us-east-1
```

### 6. **Configure kubectl**

```bash
aws eks update-kubeconfig --name eks-cluster --region us-east-1
kubectl get nodes
```

### 7. **Deploy Application**

```bash
# Apply manifests in order
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
```

### 8. **Verify Deployment**

```bash
# Check deployments
kubectl get deployments -n production
kubectl get pods -n production
kubectl get services -n production

# Check logs
kubectl logs -n production deployment/backend
kubectl logs -n production deployment/frontend

# Port forward for testing
kubectl port-forward -n production svc/backend-service 5000:5000
kubectl port-forward -n production svc/frontend-service 3000:3000
```

### 9. **Set Up Monitoring (Optional)**

```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack

# Install CloudWatch Container Insights
aws eks create-addon --cluster-name eks-cluster --addon-name cloudwatch_observability
```

### 10. **Scale & Auto-scaling**

The HPA (Horizontal Pod Autoscaler) will automatically scale pods based on CPU/memory usage.

## Key Files Created

| File                  | Purpose                               |
| --------------------- | ------------------------------------- |
| `namespace-rbac.yaml` | Namespace, ServiceAccount, RBAC roles |
| `config-secret.yaml`  | ConfigMaps and Secrets                |
| `network-policy.yaml` | Network policies for security         |
| `ingress.yaml`        | ALB Ingress for external access       |
| `backend-hpa.yaml`    | Auto-scaling for backend              |
| `deploy.sh`           | Automated deployment script           |

## Environment Variables

**Backend** receives from Kubernetes:

- `MONGO_URL` - MongoDB connection (from secret)
- Environment-specific configs (from ConfigMap)

**Frontend** receives:

- `REACT_APP_API_BASE` - Backend API URL

## Troubleshooting

```bash
# Check pod events
kubectl describe pod <pod-name> -n production

# View pod logs
kubectl logs <pod-name> -n production

# SSH into pod
kubectl exec -it <pod-name> -n production -- /bin/sh

# Check service endpoints
kubectl get endpoints -n production

# Check HPA status
kubectl get hpa -n production
```

## Security Best Practices

✅ Network policies enabled (restrict traffic)  
✅ Secrets for sensitive data  
✅ RBAC configured  
✅ Resource limits set  
✅ Images from private ECR  
✅ Auto-scaling enabled

## Cost Optimization

- Use spot instances for non-critical workloads
- Set appropriate resource requests/limits
- Use HPA to avoid over-provisioning
- Regularly review CloudWatch metrics
