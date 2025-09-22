#!/bin/bash

echo "🚀 Cyberpunk RED Chat - Optimized Backend Launcher"
echo "=================================================="

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if port 5000 is in use
if check_port 5000; then
    echo "⚠️  Port 5000 is already in use. Attempting to stop existing service..."
    pkill -f "chatbot_optimized.py\|server_standalone.js\|server_optimized.js" 2>/dev/null
    sleep 2
fi

echo ""
echo "Choose your backend option:"
echo "1. 🔧 Standalone (No external LLM) - Fastest, most reliable"
echo "2. ⚡ Optimized Python (External LLM support) - Best performance with LLM"
echo "3. 🚀 Optimized Node.js (External LLM support) - Alternative implementation"
echo ""

read -p "Enter choice (1-3) [default: 1]: " choice
choice=${choice:-1}

case $choice in
    1)
        echo "🔧 Starting Standalone Backend..."
        echo "   ✅ No external dependencies required"
        echo "   ✅ Built-in Cyberpunk responses"
        echo "   ✅ Instant startup"
        echo ""
        node server_standalone.js
        ;;
    2)
        echo "⚡ Starting Optimized Python Backend..."
        echo "   📦 Checking Python dependencies..."
        
        # Check if Python dependencies are installed
        if ! python3 -c "import fastapi, uvicorn, aiohttp" 2>/dev/null; then
            echo "   📥 Installing Python dependencies..."
            pip3 install -r requirements.txt --user --quiet
        fi
        
        echo "   ✅ Dependencies ready"
        echo "   🤖 Supports external LLM (Ollama, OpenAI-compatible)"
        echo "   🔄 Fallback to built-in responses if LLM unavailable"
        echo ""
        python3 chatbot_optimized.py
        ;;
    3)
        echo "🚀 Starting Optimized Node.js Backend..."
        echo "   📦 Checking Node.js dependencies..."
        
        # Check if Node.js dependencies are installed
        if [ ! -d "node_modules" ]; then
            echo "   📥 Installing Node.js dependencies..."
            npm install express cors body-parser axios --no-package-lock
        fi
        
        echo "   ✅ Dependencies ready"
        echo "   🤖 Supports external LLM (Ollama, OpenAI-compatible)"
        echo "   🔄 Fallback to built-in responses if LLM unavailable"
        echo ""
        node server_optimized.js
        ;;
    *)
        echo "❌ Invalid choice. Defaulting to standalone..."
        node server_standalone.js
        ;;
esac