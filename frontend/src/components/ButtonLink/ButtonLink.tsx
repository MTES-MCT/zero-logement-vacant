import { Link } from "@dataesr/react-dsfr";
import { ComponentPropsWithoutRef, MouseEventHandler } from "react";

interface LinkProps extends ComponentPropsWithoutRef<typeof Link> {
  onClick: MouseEventHandler
}

function ButtonLink(props: LinkProps) {
  return (
    <Link href="#" {...props} />
  )
}

export default ButtonLink
