import { mailto } from "../data";
import { websitePackages } from "../pricing";

export default function WebsitePackages() {
  return (
    <div className="pricing-grid">
      {websitePackages.map((plan) => (
        <article className="pricing-plan" key={plan.name}>
          <h3>{plan.name}</h3>
          <p className="plan-price">{plan.price}<span>one-time build · USD</span></p>
          <p className="plan-description">{plan.description}</p>
          <ul className="plan-features">
            {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
          <a className="plan-inquiry" href={mailto(`${plan.name} website inquiry`, `I'm interested in the ${plan.name} website package (${plan.price} base build price).\n\nBusiness / organization:\nCurrent website, if any:\nWhat I need:\nPreferred timeline:\n`)}>Ask about {plan.name.toLowerCase()}</a>
        </article>
      ))}
    </div>
  );
}
