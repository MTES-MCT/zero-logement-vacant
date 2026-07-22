function DocumentUploadHint() {
  return (
    <div>
      Taille maximale par fichier : 25Mo. Formats supportés : images (png, jpg,
      heic, webp) et documents (pdf, doc, docx, xls, xlsx, ppt, pptx). Le nom du
      fichier doit faire moins de 255 caractères. Plusieurs fichiers possibles.
      Veillez à ne pas partager de{' '}
      <a
        href="https://cnil.fr/fr/definition/donnee-sensible#:~:text=Ce%20sont%20des%20informations%20qui,physique%20de%20mani%C3%A8re%20unique%2C%20des."
        target="_blank"
        rel="noopener noreferrer"
      >
        données sensibles
        <span className="fr-sr-only"> (nouvelle fenêtre)</span>
      </a>
      .
    </div>
  );
}

export default DocumentUploadHint;
