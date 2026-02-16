#!/bin/bash

echo "=========================================="
echo "  PMS Ops - Build Standalone (APK)"
echo "=========================================="
echo ""

echo "[1/3] Verificando login no Expo..."
npx eas-cli whoami
if [ $? -ne 0 ]; then
    echo ""
    echo "[!] Voce nao esta logado no Expo."
    echo "    O build sera feito na nuvem para evitar erros de caminho longo do Windows."
    echo "    Por favor, faca login com sua conta Expo abaixo."
    echo ""
    npx eas-cli login
fi

echo ""
echo "[2/3] Verificando projeto..."
if [ ! -f "eas.json" ]; then
    echo "[!] Erro: eas.json nao encontrado."
    read -p "Pressione Enter para sair..."
    exit 1
fi

echo ""
echo "[3/3] Iniciando build na nuvem (Profile: Preview - APK)..."
echo ""
echo "    ATENCAO:"
echo "    - Se perguntar \"Generate a new Android Keystore?\", responda Y (Yes)."
echo "    - Se perguntar sobre \"Project ID\", confirme para criar."
echo ""
echo "    Aguarde o link de download ao final."
echo ""

npm run build:android:preview

echo ""
echo "=========================================="
echo "  Fim do processo"
echo "=========================================="
read -p "Pressione Enter para sair..."
