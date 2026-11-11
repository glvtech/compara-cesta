import { describe, expect, it } from "vitest";
import { matchCatalog, parseLabel, parseReceipt } from "../receipt";

const CUPOM = `
SUPERMERCADO EXEMPLO LTDA
CNPJ: 12.345.678/0001-90
DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA
001 7891000100103 LEITE UHT INTEGRAL 1L UN 2 5,49 10,98
002 7896006711117 ARROZ BRANCO TIO JOAO 5KG UN 1 28,90 28,90
003 FEIJAO CARIOCA 1KG
   2 UN x 8,49 16,98
004 BANANA PRATA KG 1,350 KG x 6,90 9,32
005 SABONETE 90G 2,59
VALOR TOTAL R$ 68,18
DINHEIRO 70,00
TROCO 1,82
`;

describe("parseReceipt", () => {
  const items = parseReceipt(CUPOM);
  it("lê itens em linha única com quantidade e preço unitário", () => {
    expect(items[0]).toMatchObject({ quantity: 2, unitPrice: 5.49 });
    expect(items[0].name).toBe("LEITE UHT INTEGRAL 1L");
    expect(items[1].name).toBe("ARROZ BRANCO TIO JOAO 5KG");
    expect(items[1]).toMatchObject({ quantity: 1, unitPrice: 28.9 });
  });
  it("junta o nome da linha anterior quando a quantidade vem na linha seguinte", () => {
    expect(items[2].name).toMatch(/FEIJAO CARIOCA/);
    expect(items[2]).toMatchObject({ quantity: 2, unitPrice: 8.49 });
  });
  it("lê item pesado e item com um único valor", () => {
    expect(items[3]).toMatchObject({ quantity: 1.35, unitPrice: 6.9 });
    expect(items[4]).toMatchObject({ quantity: 1, unitPrice: 2.59 });
  });
  it("ignora totais, troco e cabeçalho", () => {
    expect(items).toHaveLength(5);
  });
  it("corrige ponto no lugar de vírgula do OCR", () => {
    expect(parseReceipt("001 LEITE INTEGRAL 1L 5.49")[0].unitPrice).toBe(5.49);
  });
});

describe("parseLabel", () => {
  it("usa o valor depois de 'por'", () => {
    expect(parseLabel("CAFE TORRADO 500G\nde 28,90 por 24,90").price).toBe(24.9);
  });
  it("usa o maior valor pela altura da fonte", () => {
    const r = parseLabel("ARROZ BRANCO 5KG\nR$ 28,90\n5,78/kg", [
      { text: "28,90", height: 80 },
      { text: "5,78", height: 12 },
    ]);
    expect(r.price).toBe(28.9);
    expect(r.name).toMatch(/ARROZ BRANCO/);
  });
});

describe("matchCatalog", () => {
  it("casa nomes de cupom com o catálogo", () => {
    expect(matchCatalog("LEITE UHT INTEGRAL ITALAC 1L")?.item.id).toBe("leite-1l");
    expect(matchCatalog("ARROZ BRANCO TIO JOAO 5KG")?.item.id).toBe("arroz-5kg");
    expect(matchCatalog("FEIJAO CARIOCA 1KG")?.item.id).toBe("feijao-1kg");
  });
  it("não casa quando o tamanho é outro", () => {
    expect(matchCatalog("ARROZ BRANCO 1KG")).toBeNull();
  });
  it("devolve null para produto desconhecido", () => {
    expect(matchCatalog("PARAFUSO SEXTAVADO")).toBeNull();
  });
});
