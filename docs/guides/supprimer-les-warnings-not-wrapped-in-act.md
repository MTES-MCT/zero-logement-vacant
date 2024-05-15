# Supprimer les warnings `not wrapped in act(...)`

Les tests React qui utilisent des fonctions asynchrones ou des effets
secondaires peuvent générer des avertissements si ces fonctions ne sont pas
enveloppées dans un appel `act(...)`.

`@testing-library/react` wrap automatiquement les fonctions asynchrones
lorsqu’on utilise par exemple `await screen.findByRole('button', { name: /^Confirmer/ })`.

