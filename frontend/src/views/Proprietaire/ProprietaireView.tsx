import { PopupButton } from '@typeform/embed-react'
import { Col, Container, Callout, Link, Row, Text, Title, CalloutText, CalloutTitle } from '@dataesr/react-dsfr';
import buildingrent from '../../assets/images/buildingrent.svg';
import new_message from '../../assets/images/new_message.svg';
import people_search from '../../assets/images/people_search.svg';
import sync_files from '../../assets/images/sync_files.svg';



const ProprietaireView = () => {

    return (
        <>
            <Container spacing="py-7w mb-4w">
                <Row gutters>
                    <Col className="fr-col-8">
                        <Title as="h1" look="h4">
                            Vous êtes propriétaire d'un logement vacant ?
                        </Title>
                        <Title as="h2" look="h1">
                            Faites-vous aider par votre ville pour remettre votre logement sur le marché et ne pas payer de taxe supplémentaire
                        </Title>
                        <PopupButton id="w8YB8XMQ" style={{ fontSize: 20 }} className="fr-btn--md fr-btn">
                            Prendre contact avec ma commune
                        </PopupButton>
                        <Text size="lead" className="fr-py-4w">
                            Selon la commune où se trouve votre bien, vous êtes peut-être soumis à une Taxe sur les Logement Vacants (TLV ou THLV) qui peut atteindre 25% de la valeur locative.
                            Pour ne pas la payer, profitez gratuitement d'un accompagnement et bénéficiez dans certains cas d'aides financières
                        </Text>

                    </Col>
                    <Col className="fr-col-4">
                        <img src={buildingrent} style={{ maxWidth: "100%", height: "100%" }} alt="" />
                    </Col>
                </Row>
            </Container>
            <div className="bg-bf975">
                <Container spacing="py-7w mb-4w">
                    <Row>
                        <Col>
                            <Title as="h2" look="h4">
                                Concrètement, comment ça fonctionne ?
                            </Title>
                        </Col>
                    </Row>
                    <Row gutters>
                        <Col>
                            <div>
                                <img src={people_search} height="100%" alt="" />
                            </div>
                            <Text size="lg">
                                Inscrivez-vous en 2 minutes sur notre site, c'est gratuit et sans engagement de votre part.
                            </Text>
                        </Col>
                        <Col>
                            <div>
                                <img src={new_message} height="100%" alt="" />
                            </div>
                            <Text size="lg">
                                Si votre logement est situé dans une ville qui utilise notre service, nous vous mettons en relation.
                            </Text>
                        </Col>
                        <Col>
                            <div>
                                <img src={sync_files} height="100%" alt="" />
                            </div>
                            <Text size="lg">
                                Vous êtes recontacté par votre ville pour être accompagné et bénéficier le cas échéant d'aides financières.
                            </Text>
                        </Col>
                    </Row>
                </Container>
            </div>
            <div >
                <br />
                <Container spacing="fr-pt-7w">
                    <Callout hasInfoIcon={false}>
                        <CalloutTitle as="h3">
                            Dois-je payer la taxe sur les logements vacants ?
                        </CalloutTitle>
                        <CalloutText as="p">
                            <br /> Dans certaines communes, vous devez payer une taxe sur le logement vacant si vous êtes propriétaire d'un logement inoccupé depuis au moins 1 an.
                            <br />
                            Si ce logement est situé en zone tendue: Communes se caractérisant par un déséquilibre important entre l'offre et la demande de logements entraînant des difficultés d'accès au logement dans le parc résidentiel existant, vous êtes soumis à la taxe sur les logements vacants (TLV).
                            <br />
                            Si votre logement ne se trouve pas en zone tendue, vous pouvez être soumis à la taxe d'habitation sur les logements vacants (THLV).
                            <br />
                            Un simulateur permet de déterminer la zone dans laquelle est le logement.
                        </CalloutText>
                        <Link title="Accéder à la base de données" href="https://www.service-public.fr/particuliers/vosdroits/R49131" className="fr-btn--md fr-btn">
                            Vérifier si mon logement est en zone tendue
                        </Link>
                    </Callout>
                </Container>

                <Container spacing="t-7w" >
                    <Callout hasInfoIcon={false}>
                        <CalloutTitle as="h3">
                            Quels sont les logements exonérés de taxe sur les logements vacants ?
                        </CalloutTitle>
                        <CalloutText as="p">
                            <br />
                            Si le logement n'est pas à usage d'habitation: Logement équipé d'éléments de confort minimum (installation électrique, eau courante, équipement sanitaire), vous n'avez pas à payer la TLV.
                            <br />
                            De même, vous n'avez pas à payer la TLV quand le logement nécessite des travaux importants pour être habitable (par exemple, réfection complète du chauffage). En pratique, le montant des travaux doit dépasser 25 % de la valeur du logement.
                            <br />
                            Vous n'avez pas non plus à payer la TLV dans les cas suivants :
                            <br />
                            <ul>
                                <li>Logement vacant indépendamment de votre volonté (par exemple, logement mis en location ou en vente au prix du marché, mais ne trouvant pas preneur ou acquéreur)</li>
                                <li>Logement occupé plus de 90 jours de suite (3 mois) au cours d'une année</li>
                                <li>Résidence secondaire meublée soumise à la taxe d'habitation</li>
                            </ul>
                        </CalloutText>
                    </Callout>
                </Container>
                <Container spacing="t-7w">
                    <Callout hasInfoIcon={false}>
                        <CalloutTitle as="h3">
                            Autres informations
                        </CalloutTitle>
                        <CalloutText as="p">
                            <ul>
                                <li>Vous devez payer la taxe sur les logements vacants si vous êtes propriétaire ou usufruitier d'un logement vacant: Logement inoccupé pendant au moins 1 an au 1er janvier de l'année d'imposition dans les communes concernées par la taxe.</li>
                                <li>Si vous disposez de plusieurs logements vacants, vous devez payer la taxe pour chacun d'entre eux.</li>
                                <li>Pour en savoir plus, <a href="https://www.service-public.fr/particuliers/vosdroits/F17293"> consultez cette page sur service-public.fr</a> </li>
                            </ul>
                        </CalloutText>
                    </Callout>
                </Container>
            </div>



        </>
    );
};

export default ProprietaireView;

