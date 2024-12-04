# Kubed - Simplify Kubernetes Deployments 🚀

Kubed is a powerful and user-friendly CLI tool designed to eliminate the complexity of Kubernetes deployments. Whether you're deploying Helm charts, transferring container images, or setting up a local Kubernetes cluster, Kubed makes it all incredibly simple.

By wrapping popular tools like Helm, kubectl, Skopeo, and k3d, Kubed allows you to focus on deploying and managing your applications without getting bogged down by configuration files or complex workflows.

## ✨ Features

- 🚀 Streamlined Kubernetes Deployments: Deploy Helm charts and Kubernetes resources effortlessly across environments.
- 🔍 Resource Monitoring Made Easy: Keep track of your resources without navigating endless configuration files.
- 📦 Image Handling & Transfer: Easily manipulate and transfer container images.
- 🛠️ Local Cluster Setup: Spin up local Kubernetes clusters in minutes.

Kubed is designed for both beginners and experts, empowering you to deploy advanced Kubernetes setups in under 5 minutes. 🌟

💡 Ready to simplify your Kubernetes journey? Give it a try today!

## ⚙️ Prerequisites
Ensure your system meets these requirements before building Kubed from source:

[Node.js](https://nodejs.org/en/about/releases/) >= 18.19.1

## How to Deploy - Step by Step Instructions 🚀

### 1. Install dependencies

This can be achieved through a simple npm command:

```shell
npm install
```

### 2. Prepere dependance CLIs

You can prepare the required providers using:

```shell
npm run start -- init --all
```

### 3. Choose the Default Cluster

Before starting your deployment, ensure that you have validated and chosen a Kubernetes cluster. Do this with

```shell
npm run start -- config cluster
```

### 4. Start CLI with options

The command below runs the complete deployment procedure:

```shell
npm run start -- 
```