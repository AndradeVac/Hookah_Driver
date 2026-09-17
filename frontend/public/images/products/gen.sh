#!/bin/bash

# Gerar imagens SVG para cada categoria
mkdir -p .

categories=(
    "bebidas:ffd600"
    "adicionais:64c832"
    "acessorios:c864c8"
    "combos:ff6432"
    "kits:3296ff"
    "porcoes:ff3264"
    "carvoes:966432"
)

counts=(8 8 8 5 4 5 5)
idx=0

for cat_info in "${categories[@]}"; do
    IFS=':' read -r cat color <<< "$cat_info"
    count=${counts[$idx]}
    
    for i in $(seq 1 $count); do
        num=$(printf "%02d" $i)
        filename="${cat}-${num}.svg"
        
        cat > "$filename" << SVGEOF
<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="500" fill="#${color}"/>
  <text x="250" y="250" font-size="36" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">${cat^^} #${num}</text>
</svg>
SVGEOF
        echo "Gerado: $filename"
    done
    
    idx=$((idx + 1))
done

echo "OK - Imagens SVG geradas!"
