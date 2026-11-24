import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  type TextInputProps,
} from "react-native";
export const C = {
  navy: "#142C40",
  navy2: "#223F53",
  teal: "#087F79",
  tealLight: "#E3F2EF",
  paper: "#F7F8F7",
  white: "#FFFFFF",
  text: "#192E40",
  muted: "#667782",
  line: "#DFE6E8",
  amber: "#B66F19",
  amberLight: "#FFF1D8",
  red: "#B43E40",
  redLight: "#FCEDED",
};
export const money = (v: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v),
  );
export const date = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v));
export const day = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v));
export const time = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v));
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
  small = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        secondary ? s.secondary : null,
        small ? { paddingVertical: 10, paddingHorizontal: 15 } : null,
        disabled ? { opacity: 0.45 } : null,
        pressed ? { opacity: 0.78 } : null,
      ]}
    >
      <Text style={[s.buttonText, secondary ? { color: C.text } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7, marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#95A1A8"
        {...props}
        style={[
          s.input,
          props.multiline ? { minHeight: 94, textAlignVertical: "top" } : null,
          props.style,
        ]}
      />
    </View>
  );
}
export function Tag({
  label,
  tone = "teal",
}: {
  label: string;
  tone?: "teal" | "amber" | "gray" | "red";
}) {
  const color =
    tone === "teal"
      ? C.teal
      : tone === "amber"
        ? C.amber
        : tone === "red"
          ? C.red
          : C.muted;
  return (
    <View
      style={[
        s.tag,
        {
          backgroundColor:
            tone === "teal"
              ? C.tealLight
              : tone === "amber"
                ? C.amberLight
                : tone === "red"
                  ? C.redLight
                  : "#EDF1F3",
        },
      ]}
    >
      <Text style={[s.tagText, { color }]}>{label}</Text>
    </View>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.heading}>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={s.eyebrow}>{eyebrow}</Text>
        <Text style={s.title}>{title}</Text>
        {description ? <Text style={s.description}>{description}</Text> : null}
      </View>
      {action}
    </View>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={s.empty}>
      <Text style={{ fontSize: 30, color: C.teal, marginBottom: 14 }}>▤</Text>
      <Text style={s.cardTitle}>{title}</Text>
      <Text
        style={[
          s.description,
          { textAlign: "center", marginTop: 8, maxWidth: 430 },
        ]}
      >
        {description}
      </Text>
    </View>
  );
}
export function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 17, gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.wrap}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={[
              s.choice,
              value === o.value
                ? { borderColor: C.teal, backgroundColor: C.tealLight }
                : null,
            ]}
          >
            <Text
              style={{
                color: value === o.value ? C.teal : C.text,
                fontWeight: value === o.value ? "600" : "400",
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
        {!options.length ? (
          <Text style={s.hint}>Nenhum cadastro disponível.</Text>
        ) : null}
      </View>
    </View>
  );
}
export function Brand() {
  return (
    <View style={s.brand}>
      <View style={s.brandMark}>
        <Text style={{ color: C.navy, fontSize: 22, fontWeight: "800" }}>
          b
        </Text>
      </View>
      <Text style={s.brandText}>
        bilheteria<Text style={{ color: "#8DCDC4" }}>.</Text>
      </Text>
    </View>
  );
}
export const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.paper },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.paper,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: {
    height: 37,
    width: 37,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9DD5C8",
  },
  brandText: {
    fontSize: 21,
    color: C.white,
    fontWeight: "600",
    letterSpacing: -0.6,
  },
  sidebar: { width: 239, backgroundColor: C.navy, padding: 25, paddingTop: 32 },
  navLabel: {
    marginTop: 53,
    marginBottom: 15,
    fontSize: 9,
    color: "#8DA5B4",
    letterSpacing: 1.8,
    fontWeight: "600",
  },
  nav: { gap: 7 },
  navItem: {
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  navIcon: { fontSize: 19, width: 20, textAlign: "center" },
  navText: { fontSize: 13, color: "#B8C8D1", fontWeight: "500", flexShrink: 1 },
  navDot: {
    height: 5,
    width: 5,
    borderRadius: 4,
    backgroundColor: "#9DD5C8",
    marginLeft: "auto",
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 23,
    borderTopWidth: 1,
    borderColor: "#314A5D",
    marginTop: 30,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#315063",
    alignItems: "center",
    justifyContent: "center",
  },
  topbar: {
    height: 69,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
  },
  topbarText: { fontSize: 10, color: C.muted, letterSpacing: 0.6 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 10,
    color: C.teal,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 29,
    lineHeight: 38,
    color: C.text,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  description: { fontSize: 13, color: C.muted, lineHeight: 21 },
  hint: { fontSize: 11, color: C.muted, lineHeight: 17 },
  label: { fontSize: 12, color: C.text, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 9,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: C.text,
    minHeight: 48,
  },
  button: {
    borderRadius: 8,
    backgroundColor: C.teal,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 43,
  },
  buttonText: { fontSize: 12, color: C.white, fontWeight: "600" },
  secondary: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#D8E2E4",
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
  },
  cardTitle: { fontSize: 16, color: C.text, fontWeight: "600", lineHeight: 23 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  tagText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
  wrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 7,
    backgroundColor: C.white,
  },
  heroStrip: {
    padding: 30,
    backgroundColor: C.navy2,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  sectionLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 17,
  },
  sessionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  sessionCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
  },
  cardArt: { height: 140, overflow: "hidden" },
  artCircle: {
    width: 160,
    height: 160,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "#FFFFFF77",
    position: "absolute",
    right: -5,
    top: -50,
  },
  artFrame: {
    position: "absolute",
    right: 32,
    top: 35,
    width: 61,
    height: 73,
    borderWidth: 1.5,
    borderColor: "#FFFFFFAA",
    borderRadius: 12,
    transform: [{ rotate: "12deg" }],
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF40",
  },
  sessionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 11,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#EDF1F1",
  },
  metaValue: { fontSize: 13, fontWeight: "600", color: C.text, marginTop: 6 },
  empty: {
    padding: 40,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    marginTop: 20,
  },
  notice: {
    padding: 15,
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  errorText: { color: C.red, fontSize: 13, lineHeight: 20 },
  mapLayout: { gap: 22, alignItems: "flex-start" },
  screenLine: {
    height: 4,
    backgroundColor: "#A8CEC7",
    borderRadius: 50,
    alignSelf: "center",
    width: "80%",
    marginTop: 8,
  },
  seat: {
    width: 34,
    height: 33,
    borderRadius: 7,
    borderBottomWidth: 3,
    borderWidth: 1,
    borderColor: "#BFDBD4",
    backgroundColor: C.tealLight,
    alignItems: "center",
    justifyContent: "center",
  },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    flexWrap: "wrap",
  },
  divider: { borderTopWidth: 1, borderColor: C.line, width: "100%" },
  miniTicket: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9AC8BF",
    padding: 18,
    borderRadius: 9,
    gap: 13,
    backgroundColor: "#F8FCFA",
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 1.1,
    color: C.text,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingVertical: 19,
    borderBottomWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    gap: 15,
  },
  tableHead: { color: C.muted, fontSize: 10, fontWeight: "600" },
  tableCell: { flex: 1, fontSize: 12, color: C.text },
  footer: {
    marginTop: 45,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
});
