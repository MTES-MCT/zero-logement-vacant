# Tester les inputs d’une API

Tester les inputs d’une API est une étape cruciale pour garantir sa qualité.
Il est difficile de tester tous les cas possibles manuellement, c’est pourquoi
il faut décrire avec précision le cas passant avec une bibliothèque qui génère
les tests de cas à la marge de manière automatisée.
Nous utilisons [fast-check](https://fast-check.dev/docs/ecosystem/#fast-checkjest-)
dans sa version adaptée à _jest_.

```ts
import { fc, test } from '@fast-check/jest';

test.prop({
  title: fc.string(),
  description: fc.string()
})('should detect')
```
