# Kubed - Kubernetes Deployer ✈️

This tool is designed to streamline the process of deploying our products to Kubernetes clusters, making it simpler, more efficient, and hassle-free.

## 🔧 Building from Source - The Essentials

To build our tool from source, you need to have the following prerequisites in your system:

- [Node.js active LTS or maintenance LTS](https://nodejs.org/en/about/releases/) version is required. For information about specific version requirements, see the `engines` key in the `package.json` file.
- [AWS-CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), which will be required for configuring and adding AWS clusters.

## How to Deploy - Step by Step Instructions 🚀

### 1️⃣ Install the Necessary Requirements

This can be achieved through a simple npm command:

```shell
npm install
```

### 2️⃣ Set Up required executables

You can prepare the required providers using:

```shell
npm run start -- init --all
```

### 3️⃣ Choose the Default Cluster

Before starting your deployment, ensure that you have validated and chosen a Kubernetes cluster. Do this with

```shell
npm run start -- config cluster
```

#### More Clusters? No Problem!

To add fresh clusters, utilize the following commands:

- For Incorporating AWS Cluster: `npm run start -- config add-aws-cluster`
- For Integrating Azure Cluster: `npm run start -- add-azure-cluster`

### 4️⃣ Begin the Deployment Process

The command below runs the complete deployment procedure:

```shell
npm run start -- deploy up
```

> Optionally you can set the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to skip manual input of the credentials for AWS ECR registries.

#### CLI Options For You to Consider 💡

The deployer cli options: `npm run start -- <command> <sub-command ><option>`

Commands:

1. config
2. deploy
3. bundle
4. packages
   > All commands support --help option

## Usage - How to Deploy 🛠

Get executable

- Config cluster `./kubed config cluster`
- Run deployment `./kubed deploy up`

> "Quick Tip": When running these deployment procedures, switch run start -- with the name of the executable ./kubed.

# Additional References 📚

- [AWS Setup EBS CSI Driver](https://blog.saeloun.com/2023/03/21/setup-ebs-csi-driver/)
- [Setup EBS AWS Addon](https://docs.aws.amazon.com/eks/latest/userguide/managing-ebs-csi.html)
- [Using Amazon ECR Images with Amazon EKS](https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_EKS.html)
