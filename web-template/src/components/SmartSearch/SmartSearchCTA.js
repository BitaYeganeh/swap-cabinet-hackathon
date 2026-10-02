import React from 'react';

import SmartSearch from './SmartSearch';

import css from './SmartSearch.module.css';

/**
 * Page Builder field for the Console "search" call to action (e.g. the hero search).
 * It shows the Smart Search bar (AI search and photo search) in place of the
 * template's own SearchCTA. The field still only appears where the search is
 * enabled in Console.
 *
 * To show the template's own search too, render
 * <SearchCTA {...props} /> from '../../containers/PageBuilder/Primitives/SearchCTA/SearchCTA'
 * above the Smart Search bar.
 *
 * Use it through PageBuilder's options:
 *   fieldComponents: { search: { component: SmartSearchCTA, pickValidProps: exposeSearchCtaProps } }
 *
 * @component
 * @returns {JSX.Element}
 */
const SmartSearchCTA = React.forwardRef((props, ref) => (
  <div ref={ref} className={css.ctaWrapper}>
    <SmartSearch className={css.inHero} />
  </div>
));

SmartSearchCTA.displayName = 'SmartSearchCTA';

export default SmartSearchCTA;
