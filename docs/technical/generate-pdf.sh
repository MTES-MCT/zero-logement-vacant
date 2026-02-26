#!/bin/bash
#
# Script de génération PDF pour les documents techniques ZLV
# Usage: ./generate-pdf.sh [DAT|DE|DI|all]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/pdf"
TEMPLATE_DIR="$SCRIPT_DIR/templates"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Zéro Logement Vacant"
PROJECT_VERSION="${PROJECT_VERSION:-1.0}"  # Use env var or default to 1.0
PROJECT_DATE=$(date +"%d %B %Y")

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    if ! command -v pandoc &> /dev/null; then
        echo -e "${RED}Error: pandoc is not installed${NC}"
        echo "Installation:"
        echo "  macOS: brew install pandoc"
        echo "  Ubuntu: sudo apt-get install pandoc"
        exit 1
    fi

    # Check if LaTeX is installed (for PDF via LaTeX)
    if ! command -v pdflatex &> /dev/null; then
        echo -e "${YELLOW}Note: pdflatex not found, using HTML->PDF engine${NC}"
        USE_LATEX=false
    else
        USE_LATEX=true
    fi

    # Check if mermaid-cli is available (for diagrams)
    if command -v mmdc &> /dev/null; then
        HAS_MERMAID=true
        echo -e "${GREEN}✓ Mermaid CLI available - diagrams will be rendered as images${NC}"
    else
        HAS_MERMAID=false
        echo -e "${YELLOW}Note: mermaid-cli not found, diagrams will be text${NC}"
        echo "  Install: npm install -g @mermaid-js/mermaid-cli"
    fi

    echo -e "${GREEN}✓ Prerequisites checked${NC}"
}

# Convert mermaid code blocks to images
convert_mermaid_diagrams() {
    local input_file="$1"
    local output_file="$2"
    local images_dir="$TEMPLATE_DIR/images"

    mkdir -p "$images_dir"

    if [ "$HAS_MERMAID" = false ]; then
        # No mermaid-cli, just copy the file
        cp "$input_file" "$output_file"
        return
    fi

    echo -e "${YELLOW}  Converting Mermaid diagrams to images...${NC}"

    # Create a temporary working file
    local temp_file=$(mktemp)
    cp "$input_file" "$temp_file"

    # Find all mermaid code blocks and convert them
    local diagram_count=0
    local in_mermaid=false
    local mermaid_content=""
    local line_num=0
    local start_line=0

    # Process line by line
    while IFS= read -r line || [[ -n "$line" ]]; do
        ((line_num++))

        if [[ "$line" =~ ^\`\`\`mermaid ]]; then
            in_mermaid=true
            mermaid_content=""
            start_line=$line_num
            continue
        fi

        if [[ "$in_mermaid" == true ]]; then
            if [[ "$line" =~ ^\`\`\` ]]; then
                in_mermaid=false
                ((diagram_count++))

                # Save mermaid content to file
                local mmd_file="$images_dir/diagram_${diagram_count}.mmd"
                local png_file="$images_dir/diagram_${diagram_count}.png"

                echo "$mermaid_content" > "$mmd_file"

                # Convert to PNG using mmdc
                if mmdc -i "$mmd_file" -o "$png_file" -b transparent -w 800 2>/dev/null; then
                    echo -e "${GREEN}    ✓ Diagram $diagram_count converted${NC}"
                else
                    echo -e "${YELLOW}    ⚠ Diagram $diagram_count failed, keeping as text${NC}"
                fi
            else
                mermaid_content+="$line"$'\n'
            fi
        fi
    done < "$input_file"

    # Now replace mermaid blocks with image references in the output
    local result_file=$(mktemp)
    in_mermaid=false
    diagram_count=0

    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ "$line" =~ ^\`\`\`mermaid ]]; then
            in_mermaid=true
            ((diagram_count++))
            local png_file="$images_dir/diagram_${diagram_count}.png"

            if [ -f "$png_file" ]; then
                # Replace with image reference
                echo "" >> "$result_file"
                echo "![Diagramme $diagram_count]($png_file){ width=100% }" >> "$result_file"
                echo "" >> "$result_file"
            else
                # Keep original mermaid block
                echo "$line" >> "$result_file"
            fi
            continue
        fi

        if [[ "$in_mermaid" == true ]]; then
            if [[ "$line" =~ ^\`\`\` ]]; then
                in_mermaid=false
                local png_file="$images_dir/diagram_${diagram_count}.png"
                if [ ! -f "$png_file" ]; then
                    echo "$line" >> "$result_file"
                fi
            else
                local png_file="$images_dir/diagram_${diagram_count}.png"
                if [ ! -f "$png_file" ]; then
                    echo "$line" >> "$result_file"
                fi
            fi
        else
            echo "$line" >> "$result_file"
        fi
    done < "$input_file"

    mv "$result_file" "$output_file"
    rm -f "$temp_file"

    if [ $diagram_count -gt 0 ]; then
        echo -e "${GREEN}  ✓ $diagram_count diagram(s) processed${NC}"
    fi
}

# Create output directory
setup_output_dir() {
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$TEMPLATE_DIR"
}

# Create LaTeX template if needed
create_latex_template() {
    cat > "$TEMPLATE_DIR/template.tex" << 'LATEX_TEMPLATE'
\documentclass[a4paper,11pt]{article}

% Packages de base (disponibles dans toute installation LaTeX)
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[french]{babel}
\usepackage{hyperref}
\usepackage{graphicx}
\usepackage{longtable}
\usepackage{booktabs}

% Marges
\usepackage[margin=2.5cm]{geometry}

% Hyperlinks
\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    urlcolor=blue,
    citecolor=blue
}

% Tight list (requis par pandoc)
\providecommand{\tightlist}{%
  \setlength{\itemsep}{0pt}\setlength{\parskip}{0pt}}

% Document
\title{$title$}
\author{$author$}
\date{$date$}

\begin{document}

% Cover Page
\begin{titlepage}
    \centering
    \vspace*{3cm}

    {\Huge\bfseries $title$\par}
    \vspace{1cm}
    {\Large $subtitle$\par}
    \vspace{3cm}

    \rule{\textwidth}{0.4pt}
    \vspace{0.5cm}

    {\large\bfseries Projet : Zéro Logement Vacant\par}
    \vspace{0.3cm}
    {\normalsize Application de lutte contre la vacance de logements\par}

    \vspace{0.5cm}
    \rule{\textwidth}{0.4pt}

    \vfill

    \begin{tabular}{ll}
        \textbf{Version :} & $version$ \\
        \textbf{Date :} & $date$ \\
        \textbf{Auteur :} & $author$ \\
    \end{tabular}

    \vspace{2cm}

    {\small
    Ministère de la Transition Écologique\\
    Direction Générale de l'Aménagement, du Logement et de la Nature
    }
\end{titlepage}

% Table of Contents
\newpage
\tableofcontents
\newpage

% Content
$body$

\end{document}
LATEX_TEMPLATE
    echo -e "${GREEN}✓ LaTeX template created${NC}"
}

# Generate a PDF for a document
generate_pdf() {
    local doc_type="$1"
    local input_file
    local output_file
    local title
    local subtitle

    case "$doc_type" in
        "DAT")
            input_file="$SCRIPT_DIR/DAT-Dossier-Architecture-Technique.md"
            output_file="$OUTPUT_DIR/DAT-Dossier-Architecture-Technique.pdf"
            title="Dossier d'Architecture Technique"
            subtitle="DAT"
            ;;
        "DE")
            input_file="$SCRIPT_DIR/DE-Dossier-Exploitation.md"
            output_file="$OUTPUT_DIR/DE-Dossier-Exploitation.pdf"
            title="Dossier d'Exploitation"
            subtitle="DE"
            ;;
        "DI")
            input_file="$SCRIPT_DIR/DI-Dossier-Installation.md"
            output_file="$OUTPUT_DIR/DI-Dossier-Installation.pdf"
            title="Dossier d'Installation"
            subtitle="DI"
            ;;
        *)
            echo -e "${RED}Unknown document type: $doc_type${NC}"
            return 1
            ;;
    esac

    if [ ! -f "$input_file" ]; then
        echo -e "${RED}Error: Source file not found: $input_file${NC}"
        return 1
    fi

    echo -e "${YELLOW}Generating $doc_type...${NC}"

    # Pre-process: convert mermaid diagrams to images
    local processed_file="$TEMPLATE_DIR/processed_$(basename "$input_file")"
    convert_mermaid_diagrams "$input_file" "$processed_file"

    if [ "$USE_LATEX" = true ]; then
        # Generation via LaTeX (best quality)
        # Use xelatex for better Unicode support
        # Create before-body file with title page
        cat > "$TEMPLATE_DIR/before-body.tex" << BEFOREBODY
\\thispagestyle{empty}
\\begin{center}
\\vspace*{3cm}
{\\Huge\\bfseries $title}\\\\[1cm]
{\\Large Zéro Logement Vacant}\\\\[0.5cm]
{\\normalsize Application de lutte contre la vacance de logements}\\\\[3cm]
\\rule{\\textwidth}{0.4pt}\\\\[1cm]
{\\large\\bfseries Auteur :} Loïc Guillois\\\\[0.5cm]
{\\large\\bfseries Date :} $PROJECT_DATE\\\\[0.5cm]
{\\large\\bfseries Version :} $PROJECT_VERSION\\\\[1cm]
\\rule{\\textwidth}{0.4pt}
\\vfill
{\\small Ministère de la Transition Écologique\\\\
Direction Générale de l'Aménagement, du Logement et de la Nature}
\\end{center}
\\newpage
BEFOREBODY

        pandoc "$processed_file" \
            --pdf-engine=xelatex \
            --toc \
            --toc-depth=3 \
            --number-sections \
            -V geometry:margin=2.5cm \
            -V documentclass=article \
            -V lang=fr \
            -V colorlinks=true \
            -V linkcolor=blue \
            -V urlcolor=blue \
            -V mainfont="Helvetica Neue" \
            -V monofont="Menlo" \
            -V toc-own-page=true \
            -B "$TEMPLATE_DIR/before-body.tex" \
            -o "$output_file"
    else
        # Génération via HTML (fallback)
        pandoc "$processed_file" \
            --toc \
            --toc-depth=3 \
            --number-sections \
            --highlight-style=tango \
            --pdf-engine=wkhtmltopdf \
            -V title="$title" \
            -V subtitle="$subtitle" \
            -V author="Loïc Guillois" \
            -V date="$PROJECT_DATE" \
            -V version="$PROJECT_VERSION" \
            -V status="En vigueur" \
            --css="$TEMPLATE_DIR/style.css" \
            -o "$output_file" 2>/dev/null || {
                # If wkhtmltopdf is not available, generate HTML
                echo -e "${YELLOW}Generating HTML (PDF not available)${NC}"
                output_file="${output_file%.pdf}.html"
                pandoc "$processed_file" \
                    --standalone \
                    --toc \
                    --toc-depth=3 \
                    --number-sections \
                    --highlight-style=tango \
                    -V title="$title" \
                    -V subtitle="$subtitle" \
                    -V author="Loïc Guillois" \
                    -V date="$PROJECT_DATE" \
                    -o "$output_file"
            }
    fi

    if [ -f "$output_file" ]; then
        echo -e "${GREEN}✓ $doc_type generated: $output_file${NC}"
    else
        echo -e "${RED}✗ Generation failed for $doc_type${NC}"
        return 1
    fi
}

# Create CSS stylesheet (fallback)
create_css_template() {
    cat > "$TEMPLATE_DIR/style.css" << 'CSS_TEMPLATE'
@page {
    size: A4;
    margin: 2.5cm;
    @top-center {
        content: string(title);
    }
    @bottom-center {
        content: counter(page);
    }
    @bottom-right {
        content: "Zéro Logement Vacant";
    }
}

body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #333;
}

h1, h2, h3, h4 {
    color: #005293;
    page-break-after: avoid;
}

h1 {
    font-size: 24pt;
    border-bottom: 2px solid #005293;
    padding-bottom: 0.5em;
}

h2 {
    font-size: 18pt;
    margin-top: 1.5em;
}

h3 {
    font-size: 14pt;
}

code {
    background-color: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
}

pre {
    background-color: #f5f5f5;
    padding: 1em;
    border-radius: 5px;
    border: 1px solid #ddd;
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
}

th, td {
    border: 1px solid #ddd;
    padding: 0.5em;
    text-align: left;
}

th {
    background-color: #005293;
    color: white;
}

tr:nth-child(even) {
    background-color: #f9f9f9;
}

a {
    color: #005293;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

blockquote {
    border-left: 4px solid #005293;
    padding-left: 1em;
    margin-left: 0;
    color: #666;
}

.toc {
    page-break-after: always;
}

/* Cover page */
.cover-page {
    text-align: center;
    page-break-after: always;
}

.cover-page h1 {
    margin-top: 30%;
    border: none;
}
CSS_TEMPLATE
    echo -e "${GREEN}✓ CSS template created${NC}"
}

# Show help
show_help() {
    echo "Usage: $0 [OPTIONS] [DOCUMENT]"
    echo ""
    echo "Generate PDFs from technical Markdown documents."
    echo ""
    echo "DOCUMENT:"
    echo "  DAT     Generate Technical Architecture Document"
    echo "  DE      Generate Operations Document"
    echo "  DI      Generate Installation Document"
    echo "  all     Generate all documents (default)"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help     Show this help"
    echo "  -v, --verbose  Verbose mode"
    echo ""
    echo "PREREQUISITES:"
    echo "  - pandoc (required)"
    echo "  - pdflatex (recommended, for best quality)"
    echo "  - mermaid-cli (optional, for diagrams)"
    echo ""
    echo "INSTALLING PREREQUISITES:"
    echo "  macOS:"
    echo "    brew install pandoc"
    echo "    brew install --cask mactex  # for pdflatex"
    echo "    npm install -g @mermaid-js/mermaid-cli"
    echo ""
    echo "  Ubuntu/Debian:"
    echo "    sudo apt-get install pandoc texlive-latex-base texlive-fonts-recommended"
    echo "    npm install -g @mermaid-js/mermaid-cli"
    echo ""
    echo "OUTPUT:"
    echo "  PDF files are generated in: $OUTPUT_DIR/"
}

# Main
main() {
    local doc_type="all"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            DAT|DE|DI|all)
                doc_type="$1"
                shift
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done

    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║       PDF Generation - Zéro Logement Vacant               ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""

    check_prerequisites
    setup_output_dir
    create_latex_template
    create_css_template

    echo ""

    if [ "$doc_type" = "all" ]; then
        generate_pdf "DAT"
        generate_pdf "DE"
        generate_pdf "DI"
    else
        generate_pdf "$doc_type"
    fi

    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                    Generation complete                     ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Files generated in: $OUTPUT_DIR/"
    ls -la "$OUTPUT_DIR/"
}

main "$@"
