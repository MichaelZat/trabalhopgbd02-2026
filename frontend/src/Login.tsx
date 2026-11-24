import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { request, setToken, type User } from "./api";
import { C, s, Button, Field, Brand } from "./interface";
export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const { width } = useWindowDimensions(),
    wide = width >= 900;
  const [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await request<{ usuario: User; token: string }>(
        register ? "/auth/cadastro" : "/autenticacao/entrar",
        "POST",
        register ? { name, email, password } : { email, password },
      );
      setToken(result.token);
      onLogin(result.usuario);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={{ backgroundColor: C.paper }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View
        style={{
          flexGrow: 1,
          minHeight: "100%",
          flexDirection: wide ? "row" : "column",
        }}
      >
        <View
          style={{
            backgroundColor: C.navy,
            flex: wide ? 1 : undefined,
            padding: wide ? 58 : 28,
            minHeight: wide ? 700 : 400,
          }}
        >
          <Brand />
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              paddingVertical: wide ? 65 : 35,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 2.1,
                fontWeight: "600",
                color: "#A0CABE",
                marginBottom: 20,
              }}
            >
              CADA EXPERIÊNCIA COMEÇA AQUI
            </Text>
            <Text
              style={{
                fontSize: wide ? 53 : 35,
                fontWeight: "500",
                lineHeight: wide ? 64 : 44,
                color: C.white,
                letterSpacing: -1.5,
              }}
            >
              O próximo lugar{"\n"}é seu.
            </Text>
            <Text
              style={{
                fontSize: 15,
                lineHeight: 25,
                color: "#B6C7CF",
                maxWidth: 340,
                marginTop: 23,
              }}
            >
              Escolha a sessão, encontre seu assento e tenha seu ingresso em
              mãos.
            </Text>
            <View
              accessibilityElementsHidden
              style={{ alignSelf: "flex-start", marginTop: 40, gap: 10 }}
            >
              {["A", "B", "C"].map((r, ri) => (
                <View
                  key={r}
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#A6B5BE", width: 18, fontSize: 11 }}>
                    {r}
                  </Text>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <View
                      key={n}
                      style={{
                        width: wide ? 35 : 29,
                        height: wide ? 31 : 26,
                        borderRadius: 8,
                        backgroundColor:
                          ri === 1 && n >= 3 && n <= 4
                            ? "#99D0C5"
                            : ri === 0 && n > 4
                              ? "#385165"
                              : "#29475C",
                        borderBottomWidth: 3,
                        borderBottomColor:
                          ri === 1 && n >= 3 && n <= 4 ? "#64AFA1" : "#3B586C",
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          <Text style={{ color: "#9DB0BD", fontSize: 12 }}>
            Sua sessão. Seu assento. Sua experiência.
          </Text>
        </View>
        <View
          style={{
            justifyContent: "center",
            flex: wide ? 1 : undefined,
            padding: wide ? 64 : 28,
          }}
        >
          <View style={{ width: "100%", maxWidth: 410, alignSelf: "center" }}>
            <Text style={s.eyebrow}>
              {register ? "SUA PRIMEIRA SESSÃO" : "BEM-VINDO À BILHETERIA"}
            </Text>
            <Text style={[s.title, { marginTop: 10, marginBottom: 10 }]}>
              {register ? "Crie sua conta" : "Entre para continuar"}
            </Text>
            <Text style={[s.description, { marginBottom: 30 }]}>
              {register
                ? "Cadastre-se para reservar seus assentos."
                : "Acesse suas sessões e seus ingressos."}
            </Text>
            {register ? (
              <Field
                label="Nome"
                placeholder="Como podemos chamar você?"
                value={name}
                onChangeText={setName}
                autoComplete="name"
              />
            ) : null}
            <Field
              label="E-mail"
              placeholder="voce@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Senha"
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={register ? "new-password" : "current-password"}
              onSubmitEditing={submit}
            />
            {error ? (
              <Text
                accessibilityRole="alert"
                style={[s.errorText, { marginBottom: 16 }]}
              >
                {error}
              </Text>
            ) : null}
            <Button
              label={
                busy
                  ? "Aguarde…"
                  : register
                    ? "Criar conta"
                    : "Entrar na minha conta"
              }
              onPress={submit}
              disabled={busy}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRegister(!register);
                setError("");
              }}
              style={{ paddingVertical: 25 }}
            >
              <Text style={{ color: C.muted, textAlign: "center" }}>
                {register ? "Já tem uma conta? " : "Ainda não tem uma conta? "}
                <Text style={{ color: C.teal, fontWeight: "700" }}>
                  {register ? "Entrar" : "Cadastre-se"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
