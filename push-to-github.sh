#!/bin/bash

echo "🚀 Pushing Tableau MCP Server to GitHub..."
echo "Repository: https://github.com/fpvjohnt/Tableau"
echo ""

# Check if we have commits to push
if [ -z "$(git log --oneline 2>/dev/null)" ]; then
    echo "❌ No commits found. Make sure you're in the right directory."
    exit 1
fi

echo "📋 Current commits to be pushed:"
git log --oneline --graph -5
echo ""

echo "🔐 GitHub will prompt for your username and password/token"
echo "Username: fpvjohnt"
echo "Password: Use your GitHub password or Personal Access Token"
echo ""

# Set the remote if not already set
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/fpvjohnt/Tableau.git

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View at: https://github.com/fpvjohnt/Tableau"
    echo ""
    echo "📱 To download on your Mac:"
    echo "   git clone https://github.com/fpvjohnt/Tableau.git"
    echo "   cd Tableau"
    echo "   ./setup-macos-tableau.sh"
else
    echo ""
    echo "❌ Push failed. This might be because:"
    echo "1. You need a Personal Access Token instead of password"
    echo "2. Two-factor authentication is enabled"
    echo "3. The repository already has content"
    echo ""
    echo "💡 To create a Personal Access Token:"
    echo "   1. Go to https://github.com/settings/tokens"
    echo "   2. Click 'Generate new token (classic)'"
    echo "   3. Select 'repo' permissions"
    echo "   4. Use the token as your password"
fi