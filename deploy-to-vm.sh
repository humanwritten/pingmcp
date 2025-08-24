#!/bin/bash

# PingMCP Cross-Platform Deployment Script
# Usage: ./deploy-to-vm.sh [linux|windows] [vm-host] [username]

set -e

VM_TYPE="$1"
VM_HOST="$2"
VM_USER="$3"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="pingmcp"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${MAGENTA}🚀 PingMCP VM Deployment${NC}"
    echo -e "${MAGENTA}========================${NC}"
}

print_usage() {
    echo "Usage: $0 [linux|windows] [vm-host] [username]"
    echo ""
    echo "Examples:"
    echo "  $0 linux ubuntu-vm.local myuser"
    echo "  $0 windows windows-vm.local Administrator"
    echo ""
    echo "Alternative: Use Parallels shared folders"
    echo "  1. Enable shared folders in Parallels"
    echo "  2. Access project at /media/psf/Home/Documents/Github/pingmcp (Linux)"
    echo "  3. Access project at \\\\psf\\Home\\Documents\\Github\\pingmcp (Windows)"
}

deploy_to_linux() {
    echo -e "${CYAN}📦 Deploying to Linux VM: ${VM_HOST}${NC}"
    
    # Create project directory on remote
    ssh "${VM_USER}@${VM_HOST}" "mkdir -p ~/${PROJECT_NAME}"
    
    # Copy project files
    echo -e "${BLUE}📋 Copying files...${NC}"
    scp -r \
        server.js \
        package.json \
        test-sounds.js \
        test-cross-platform.js \
        notification.mp3 \
        custom/ \
        README.md \
        "${VM_USER}@${VM_HOST}:~/${PROJECT_NAME}/"
    
    # Install dependencies and run test
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    ssh "${VM_USER}@${VM_HOST}" "cd ~/${PROJECT_NAME} && npm install"
    
    echo -e "${BLUE}🧪 Running tests...${NC}"
    ssh "${VM_USER}@${VM_HOST}" "cd ~/${PROJECT_NAME} && npm run test-cross-platform"
    
    echo -e "${GREEN}✅ Linux deployment complete${NC}"
}

deploy_to_windows() {
    echo -e "${CYAN}📦 Deploying to Windows VM: ${VM_HOST}${NC}"
    echo -e "${YELLOW}⚠️  Windows deployment requires PowerShell remoting or manual setup${NC}"
    
    echo -e "${BLUE}📋 Manual Windows deployment steps:${NC}"
    echo "1. Copy project folder to Windows VM"
    echo "2. Open PowerShell as Administrator"
    echo "3. Navigate to project directory"
    echo "4. Run: npm install"
    echo "5. Run: npm run test-cross-platform"
    echo ""
    echo -e "${CYAN}Alternative: Use Parallels shared folders${NC}"
    echo "Windows path: \\\\psf\\Home\\Documents\\Github\\pingmcp"
}

check_prerequisites() {
    if ! command -v ssh &> /dev/null; then
        echo -e "${RED}❌ SSH not found. Install SSH client.${NC}"
        exit 1
    fi
    
    if ! command -v scp &> /dev/null; then
        echo -e "${RED}❌ SCP not found. Install SSH client.${NC}"
        exit 1
    fi
}

main() {
    print_header
    
    if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        print_usage
        exit 0
    fi
    
    if [ $# -lt 3 ]; then
        echo -e "${RED}❌ Missing required arguments${NC}"
        print_usage
        exit 1
    fi
    
    check_prerequisites
    
    case "$VM_TYPE" in
        "linux")
            deploy_to_linux
            ;;
        "windows")
            deploy_to_windows
            ;;
        *)
            echo -e "${RED}❌ Unknown VM type: $VM_TYPE${NC}"
            print_usage
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${MAGENTA}🎯 Cross-Platform Testing Complete!${NC}"
    echo -e "${BLUE}Check test-results-*.json files for detailed results${NC}"
}

main "$@"