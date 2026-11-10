import { describe, expect, it } from "vitest";
import { adNetworkOf, clickIdOf, embedSnippet, hostOf, pickAttribution, safeUrl, topCampaigns } from "./attribution";

describe("pickAttribution", () => {
  it("pega só as chaves conhecidas, aparadas e não vazias", () => {
    expect(
      pickAttribution({ utm_source: " meta ", utm_term: "crm", gclid: "abc", utm_medium: "", foo: "x", utm_content: 3 }),
    ).toEqual({ utm_source: "meta", utm_term: "crm", gclid: "abc" });
  });
  it("limita o tamanho", () => {
    expect(pickAttribution({ utm_campaign: "a".repeat(500) }).utm_campaign).toHaveLength(200);
  });
});

describe("clickIdOf / adNetworkOf", () => {
  it("prefixa pela rede e prioriza o Google", () => {
    expect(clickIdOf({ gclid: "g1", fbclid: "f1" })).toBe("gclid:g1");
    expect(clickIdOf({ fbclid: "f1" })).toBe("fbclid:f1");
    expect(clickIdOf({})).toBeNull();
  });
  it("identifica a rede", () => {
    expect(adNetworkOf("gclid:g1")).toBe("Google Ads");
    expect(adNetworkOf("fbclid:f1")).toBe("Meta Ads");
    expect(adNetworkOf(null)).toBeNull();
  });
});

describe("safeUrl / hostOf", () => {
  it("aceita só http(s) e remove o fragmento", () => {
    expect(safeUrl("https://site.com/promo?utm_source=x#topo")).toBe("https://site.com/promo?utm_source=x");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("não é url")).toBeNull();
    expect(safeUrl(42)).toBeNull();
  });
  it("mostra o domínio sem www", () => {
    expect(hostOf("https://www.instagram.com/p/1")).toBe("instagram.com");
    expect(hostOf(null)).toBeNull();
  });
});

describe("topCampaigns", () => {
  it("conta, ordena e ignora leads sem campanha", () => {
    const leads = [{ utmCampaign: "bf" }, { utmCampaign: "natal" }, { utmCampaign: "bf" }, { utmCampaign: null }];
    expect(topCampaigns(leads)).toEqual([
      { campaign: "bf", count: 2 },
      { campaign: "natal", count: 1 },
    ]);
  });
});

describe("embedSnippet", () => {
  it("monta o iframe repassando UTMs e a página do site", () => {
    const s = embedSnippet("https://app.com/f/orcamento", "orcamento");
    expect(s).toContain('id="jv-form-orcamento"');
    expect(s).toContain('"https://app.com/f/orcamento"');
    expect(s).toContain('"utm_campaign"');
    expect(s).toContain('"lp",location.href');
  });
});
