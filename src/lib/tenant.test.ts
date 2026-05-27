import { describe, expect, it } from "vitest";
import { parseTenantFromHost } from "./tenant";

const BASE = "recrutafacil.com";

describe("parseTenantFromHost", () => {
  it("identifica subdominio padrao", () => {
    expect(parseTenantFromHost("empresax.recrutafacil.com", BASE)).toEqual({
      kind: "subdomain",
      slug: "empresax",
      raw: "empresax.recrutafacil.com",
    });
  });

  it("aceita slug com hifen", () => {
    const r = parseTenantFromHost("empresa-beta.recrutafacil.com", BASE);
    expect(r.kind).toBe("subdomain");
    expect(r.kind === "subdomain" && r.slug).toBe("empresa-beta");
  });

  it("normaliza maiusculas", () => {
    const r = parseTenantFromHost("EMPRESAX.RecrutaFacil.com", BASE);
    expect(r.kind === "subdomain" && r.slug).toBe("empresax");
  });

  it("ignora porta", () => {
    const r = parseTenantFromHost("empresax.recrutafacil.com:3000", BASE);
    expect(r.kind === "subdomain" && r.slug).toBe("empresax");
  });

  it("trata dominio raiz como root", () => {
    expect(parseTenantFromHost("recrutafacil.com", BASE).kind).toBe("root");
  });

  it("trata www do dominio base como root", () => {
    expect(parseTenantFromHost("www.recrutafacil.com", BASE).kind).toBe("root");
  });

  it("trata host vazio como invalido", () => {
    expect(parseTenantFromHost("", BASE).kind).toBe("invalid");
    expect(parseTenantFromHost(null, BASE).kind).toBe("invalid");
  });

  it("rejeita subdominio com caracteres invalidos", () => {
    expect(parseTenantFromHost("empresa_x.recrutafacil.com", BASE).kind).toBe("invalid");
    expect(parseTenantFromHost("-empresa.recrutafacil.com", BASE).kind).toBe("invalid");
  });

  it("rejeita subdominio aninhado (ex: a.b.recrutafacil.com)", () => {
    expect(parseTenantFromHost("foo.bar.recrutafacil.com", BASE).kind).toBe("invalid");
  });

  it("trata host sem ponto e diferente do base como invalido", () => {
    expect(parseTenantFromHost("naoexiste", BASE).kind).toBe("invalid");
  });

  it("trata localhost com subdominio em dev", () => {
    expect(parseTenantFromHost("empresax.localhost", "localhost")).toMatchObject({
      kind: "subdomain",
      slug: "empresax",
    });
  });

  it("trata localhost puro como root em dev", () => {
    expect(parseTenantFromHost("localhost:3000", "localhost").kind).toBe("root");
  });

  it("identifica dominio customizado", () => {
    expect(parseTenantFromHost("vagas.acme.com.br", BASE)).toEqual({
      kind: "custom",
      customDomain: "vagas.acme.com.br",
      raw: "vagas.acme.com.br",
    });
  });

  it("normaliza www em dominio customizado removendo prefixo nao aplicavel", () => {
    const r = parseTenantFromHost("vagas.acme.com.br:8080", BASE);
    expect(r.kind === "custom" && r.customDomain).toBe("vagas.acme.com.br");
  });
});
