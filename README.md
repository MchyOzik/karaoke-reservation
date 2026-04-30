# Master Technical Specification: NeonStage Karaoke Reservation System

## 0. Infrastructure Topology (Visual)

```mermaid
flowchart TD
    subgraph Internet ["Internet"]
        User((User))
    end

    subgraph Public_Zone ["Public Zone (Stack 1)"]
        ALB["karaoke-alb (ALB)"]
        IGW["Internet Gateway"]
    end

    subgraph App_Zone ["Application Zone (Stack 1)"]
        EC2["karaoke-web-server (Nginx)"]
        Lambda["7x Lambda Functions (Python 3.12)"]
        NAT["NAT Gateway"]
    end

    subgraph Data_Zone ["Database Zone (Stack 2)"]
        RDS[("karaoke-rds-postgres")]
        DDB[("karaoke-reservation-session-locks")]
    end

    subgraph Storage_Zone ["Storage Layer"]
        S3["karaoke-payment-proofs (S3)"]
    end

    %% Connections
    User -->|Port 80| ALB
    ALB -->|Forward| EC2
    EC2 -->|API Calls| Lambda
    Lambda -->|SQL| RDS
    Lambda -->|NoSQL| DDB
    User -->|Upload| S3
    Lambda -->|Presign| S3
```

## 1. Project Overview & Strategy

### 1.1. Operational Background
In the highly competitive landscape of 2026 entertainment services, the **NeonStage Karaoke Reservation System (KRS)** stands as a benchmark for cloud-native operational excellence. The system is engineered to solve the "Double-Booking Paradox" prevalent in legacy karaoke management systems. By leveraging a hybrid serverless architecture, KRS provides sub-second responsiveness for global users while maintaining strict transactional integrity at the database layer.

The architecture emphasizes **Operational Resilience**, **Granular Observability**, and **Controlled Scalability**. Each component is decoupled to ensure that a failure in one layer (e.g., the playback player) does not impact the core booking engine. This document serves as the single source of truth for the deployment, configuration, and maintenance of the KRS infrastructure.

### 1.2. Engineering Objectives
- **Transactional Consistency**: Using RDS PostgreSQL 15 for confirmed bookings and DynamoDB for atomic temporary locks.
- **Fault Isolation**: Implementing a 6-subnet VPC architecture to segregate traffic between public access, application logic, and isolated data.
- **Latency Optimization**: Utilizing AWS Lambda with Python 3.12 for event-driven execution with minimal cold-start impact.
- **Security by Design**: Enforcing HTTPS-only communication and strict IAM policies following the principle of least privilege.

### 1.3. Task List (Engineer Roadmap)

| Module | Task ID | Description | Requirement |
| :--- | :--- | :--- | :--- |
| **Network** | N.1 | Provision Dual-Stack VPC (IPv4 Only) | 6 Subnets, IGW, NAT |
| | N.2 | Configure Routing Tables | Public, Private, Isolated RTs |
| | N.3 | Create Security Group Matrix | Web, Lambda, RDS, ALB SGs |
| **Compute** | C.1 | Deploy Application Load Balancer | Internet-facing, Port 80 |
| | C.2 | Launch Web Server (AL2023) | EC2 with Project-Specific UserData |
| | C.3 | Configure Target Groups | Health Check on /health.html |
| **Data** | D.1 | Provision RDS PostgreSQL 15 | Multi-AZ, Isolated Subnets |
| | D.2 | Provision DynamoDB Locking Table | lock_id (PK) + TTL Support |
| | D.3 | Initialize DB Schema | Execution of init-db.sql |
| **Logic** | L.1 | Deploy Lambda Suite (7 Functions) | Python 3.12, VPC Attached |
| | L.2 | Configure Lambda Layer | psycopg2 & shared utilities |
| | L.3 | Setup Environment Variables | Tables per function |
| **API** | A.1 | Architect REST API | Amazon API Gateway |
| | A.2 | Configure CORS & Stages | Regional Endpoint, Prod Stage |
| **Storage** | S.1 | Provision Payment Bucket | S3 with CORS JSON |

---

## 2. Technical Standards & Environment

| Parameter | Value |
| :--- | :--- |
| **Region** | us-east-1 (N. Virginia) |
| **Resource Prefix** | `karaoke-` |
| **VPC CIDR** | 35.10.0.0/18 |
| **Lambda Runtime** | Python 3.12 |
| **DB Engine** | PostgreSQL 15 |
| **Web OS** | Amazon Linux 2023 |
| **Architecture** | 6-Subnet Hybrid Serverless |

The system uses a **Client-Side Dynamic Configuration** strategy. API Gateway endpoints and S3 Bucket names are managed directly via the frontend "Settings" modal (stored in LocalStorage) to ensure portability across different deployment stages without re-building the frontend.

---

## 3. Implementation: Networking & Infrastructure (Stack 1)

### 3.1. VPC Segmentation Detail
The network foundation is segmented into 3 security zones across 2 Availability Zones (us-east-1a and us-east-1b).

#### Public Zone (External Facing)
- **karaoke-public-1**: 35.10.0.0/25 (AZ-A)
- **karaoke-public-2**: 35.10.1.0/25 (AZ-B)
*Hosts: ALB, NAT Gateway.*

#### Private Zone (Application Layer)
- **karaoke-private-1**: 35.10.11.0/25 (AZ-A)
- **karaoke-private-2**: 35.10.12.0/25 (AZ-B)
*Hosts: EC2 Web Server, Lambda Functions.*

#### Isolated Zone (Data Layer)
- **karaoke-db-1**: 35.10.21.0/25 (AZ-A)
- **karaoke-db-2**: 35.10.22.0/25 (AZ-B)
*Hosts: RDS PostgreSQL.*

### 3.2. Compute Layer: EC2 & ALB Specification

#### Application Load Balancer
- **Name**: `karaoke-alb`
- **Security Group**: `karaoke-sg-alb` (Allows Inbound 80 from 0.0.0.0/0)
- **Target Group**: `karaoke-tg-web` (Port 80, Health Check: `/health.html`)

#### Web Server (EC2)
- **Name**: `karaoke-web-server`
- **AMI**: Latest Amazon Linux 2023
- **Instance Type**: `t3.micro`
- **Security Group**: `karaoke-sg-web` (Allows Inbound 80 ONLY from `karaoke-sg-alb`)
- **Project-Specific User Data**:
```bash
#!/bin/bash
# 1. Update and Install Core Dependencies
dnf update -y
dnf install -y httpd git php

# 2. Start Web Server
systemctl start httpd
systemctl enable httpd

# 3. Setup Project Files
cd /var/www/html
# Clone project repository (Replace with actual repo URL if available)
git clone https://github.com/cc/karaoke-reservation.git .
# Move frontend files to root
cp -r frontend/* .
# Clean up
rm -rf frontend

# 4. Configure Permissions
chown -R apache:apache /var/www/html
chmod -R 755 /var/www/html

# 5. Create Health Check File
echo "NeonStage System Online" > /var/www/html/health.html
```

---

## 4. Implementation: Database Layer (Stack 2)

### 4.1. RDS PostgreSQL 15
- **Engine**: PostgreSQL 15
- **Storage**: 20GB gp2
- **Security Group**: `karaoke-sg-rds` (Inbound 5432 ONLY from `karaoke-sg-lambda`)

### 4.2. DynamoDB Atomic Locking
- **Table Name**: `karaoke-reservation-session-locks`
- **PK**: `lock_id` (String)
- **TTL**: `expires_at` (Attribute for automatic lock expiration)

---

## 5. Backend Logic (AWS Lambda) - Python 3.12

### 5.1. Global Lambda Configuration
| Parameter | Default |
| :--- | :--- |
| **Runtime** | Python 3.12 |

### 5.2. Function-Specific Sizing & Environment

#### 5.2.1. karaoke-lambda-rooms (Fetch Rooms)
- **Memory**: 128 MB
- **Timeout**: 15s
- **Environment Variables**:
| Key | Value |
| :--- | :--- |
| `DB_HOST` | [RDS Endpoint] |
| `DB_NAME` | `karaokedb` |
| `DB_USER` | `dbadmin` |
| `DB_PASS` | `SecurePass123!` |

#### 5.2.2. karaoke-lambda-booking (Process Order)
- **Memory**: 256 MB
- **Timeout**: 30s
- **Environment Variables**:
| Key | Value |
| :--- | :--- |
| `DB_HOST` | [RDS Endpoint] |
| `DYNAMODB_TABLE` | `karaoke-reservation-session-locks` |

#### 5.2.3. karaoke-lambda-status (Live Dashboard)
- **Memory**: 128 MB
- **Timeout**: 20s
- **Environment Variables**:
| Key | Value |
| :--- | :--- |
| `DB_HOST` | [RDS Endpoint] |
| `DYNAMODB_TABLE` | `karaoke-reservation-session-locks` |

#### 5.2.4. karaoke-lambda-confirm (Finalize Payment)
- **Memory**: 128 MB
- **Timeout**: 30s
- **Environment Variables**:
| Key | Value |
| :--- | :--- |
| `DB_HOST` | [RDS Endpoint] |
| `S3_BUCKET` | [S3 Bucket Name] |
| `DYNAMODB_TABLE` | `karaoke-reservation-session-locks` |

#### 5.2.5. karaoke-lambda-presign (Upload URL Gen)
- **Memory**: 128 MB
- **Timeout**: 10s
- **Environment Variables**:
| Key | Value |
| :--- | :--- |
| `S3_BUCKET` | [S3 Bucket Name] |
| `REGION_NAME` | `us-east-1` |

#### 5.2.6. karaoke-lambda-check-slot (Availability Check)
- **Memory**: 128 MB
- **Timeout**: 15s
- **Environment Variables**:
| Key | Value |
| :--- | :--- |
| `DB_HOST` | [RDS Endpoint] |
| `DYNAMODB_TABLE` | `karaoke-reservation-session-locks` |

#### 5.2.7. karaoke-lambda-cleanup (Maintenance)
- **Memory**: 128 MB
- **Timeout**: 60s
- **Environment Variables**:
| Key | Value |
| :--- | :--- |
| `DB_HOST` | [RDS Endpoint] |
| `DYNAMODB_TABLE` | `karaoke-reservation-session-locks` |

---

## 6. API Gateway Interface

### 6.1. Endpoint Documentation
| Resource | Method | Lambda Integration | Logic Description |
| :--- | :--- | :--- | :--- |
| `/rooms` | GET | `karaoke-rooms` | Reads active rooms from RDS |
| `/booking` | POST | `karaoke-booking` | Performs Atomic Lock & Pending Insert |
| `/status` | GET | `karaoke-status` | Aggregates RDS and DDB sessions |
| `/check-slot` | GET | `karaoke-check-slot` | Real-time availability verification |
| `/confirm` | POST | `karaoke-confirm` | Verifies payment and finalizes reservation |
| `/presign` | POST | `karaoke-presign` | Generates secure upload URL for receipts |

---

## 7. Storage & Security

### 7.1. S3 Payment#### 6.2.2. S3 Bucket Policy (Public Access)
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::S3_BUCKET/*"
        }
    ]
}
```


---
© 2026 NeonStage System - All Technical Specifications Finalized.
