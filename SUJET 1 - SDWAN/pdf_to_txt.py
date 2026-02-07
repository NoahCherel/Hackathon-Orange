import os
try:
    from pypdf import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        print("Erreur : La bibliothèque 'pypdf' ou 'PyPDF2' n'est pas installée.")
        print("Veuillez l'installer avec : pip install pypdf")
        exit(1)

def convert_pdfs_to_txt():
    # Obtenir le répertoire courant
    current_dir = os.getcwd()
    
    # Lister tous les fichiers du répertoire
    files = [f for f in os.listdir(current_dir) if f.lower().endswith('.pdf')]
    
    if not files:
        print("Aucun fichier PDF trouvé dans ce répertoire.")
        return

    print(f"Trouvé {len(files)} fichiers PDF. Début de la conversion...")

    for filename in files:
        pdf_path = os.path.join(current_dir, filename)
        txt_filename = os.path.splitext(filename)[0] + ".txt"
        txt_path = os.path.join(current_dir, txt_filename)
        
        print(f"Conversion de '{filename}' vers '{txt_filename}'...")
        
        try:
            reader = PdfReader(pdf_path)
            text_content = []
            
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
            
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write("\n".join(text_content))
                
            print(f"Succès : '{txt_filename}' créé.")
            
        except Exception as e:
            print(f"Erreur lors de la conversion de '{filename}': {e}")

    print("\nToutes les conversions sont terminées.")

if __name__ == "__main__":
    convert_pdfs_to_txt()
