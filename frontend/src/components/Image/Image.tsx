interface Props {
  alt: string;
  src: string;
}

function Image(props: Readonly<Props>) {
  return <img alt={props.alt} className="fr-responsive-img" src={props.src} />;
}

export default Image;
