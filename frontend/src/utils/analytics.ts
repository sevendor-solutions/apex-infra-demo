import ReactGA from "react-ga4";

export const initGA = () => {
  ReactGA.initialize("G-KTBW191SK4");
};

export const pageView = (path: string) => {
  ReactGA.send({
    hitType: "pageview",
    page: path,
  });
};