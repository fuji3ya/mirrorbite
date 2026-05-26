import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';
import { colors, radii, shadows, typography } from '@/lib/theme';

type Variant = 'primary' | 'small' | 'tinted';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  arrow?: boolean;
  disabled?: boolean;
}

/**
 * CTAButton — gradient teal + glow shadow (HTML prototype mirror)
 * 注: gradient は expo-linear-gradient 採用予定だが、Phase 0 は solid teal で代替
 */
export function CTAButton({ label, variant = 'primary', arrow = true, disabled, style, ...rest }: Props) {
  const isPrimary = variant === 'primary' || variant === 'small';
  const isSmall = variant === 'small';
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isSmall && styles.small,
        isPrimary && !disabled && styles.primary,
        isPrimary && !disabled && shadows.ctaGlow,
        variant === 'tinted' && styles.tinted,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        typeof style === 'function' ? null : style,
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        {arrow && <Text style={[styles.arrow, disabled && styles.labelDisabled]}> →</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: colors.teal500,
  },
  tinted: {
    backgroundColor: colors.teal50,
  },
  disabled: {
    backgroundColor: colors.ink100,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  labelDisabled: {
    color: colors.ink400,
  },
  arrow: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 4,
  },
});
