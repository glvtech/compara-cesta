# Fonte dos preços

**Estado atual: estimativas.** Os valores em `src/data/catalog.ts` e os multiplicadores
em `src/data/retailers.ts` são estimativas iniciais para SP, escolhidas como ponto de
partida. **Não são preços medidos** e a interface sempre avisa isso.

## Caminho para dados reais
1. Conferir manualmente uma amostra em mercados de SP e ajustar o catálogo.
2. Usar o Open Food Facts (licença ODbL, exige atribuição) para nomes/marcas por código de barras.
3. Registrar os preços anotados pelos usuários ("anotar preço") e usá-los na comparação.
4. Pedir dados de notas fiscais à Sefaz de SP. Não há API pública conhecida; não raspar apps de terceiros.
