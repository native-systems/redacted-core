import React from "react"

import { Text, TextProps } from "./Text"


type SectionHeaderProps = Omit<TextProps, "type">

/**
 * A {@link Text} component with type `sectionHeader`.
 * @param props {@link Text} properties
 */
export const SectionHeader =
  (props: SectionHeaderProps) => <Text type="sectionHeader" {...props} />
