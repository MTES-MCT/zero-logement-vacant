import { Link } from "@dataesr/react-dsfr";
import { ComponentPropsWithoutRef } from "react";

type LinkProps = ComponentPropsWithoutRef<typeof Link>

function ButtonLink(props: LinkProps) {
  return (
    <Link href="#" {...props} />
  )
}

export default ButtonLink
