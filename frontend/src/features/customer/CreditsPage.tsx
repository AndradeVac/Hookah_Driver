import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

// Third-party photos used in the menu. CC BY / CC BY-SA licenses require this attribution;
// add an entry here whenever a licensed photo is added to public/images (see design/IMAGENS.md).
const CREDITS = [
  {
    usedFor: 'Carvão, Kits',
    title: 'Vugleni-nargile2',
    author: 'PisnaMiOtVas',
    source: 'https://commons.wikimedia.org/wiki/File:Vugleni-nargile2.jpg',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    usedFor: 'Acender carvão, Adicionais',
    title: 'A hand carefully arranges charcoal pieces on a hookah bowl',
    author: 'Shixart1985',
    source: 'https://commons.wikimedia.org/wiki/File:A_hand_carefully_arranges_charcoal_pieces_on_a_hookah_bowl,_readying_it_for_use.jpg',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    usedFor: 'Coca',
    title: 'Coca-cola 50cl can - Italia',
    author: 'M0tty',
    source: 'https://commons.wikimedia.org/wiki/File:Coca-cola_50cl_can_-_Italia.jpg',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    usedFor: 'Monster',
    title: 'Monster Energy Mega can',
    author: 'DYVER',
    source: 'https://commons.wikimedia.org/wiki/File:Monster_Energy_Mega_can.jpg',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    usedFor: 'Água',
    title: 'Bottle of Water',
    author: 'Jiafei Slay Queen',
    source: 'https://commons.wikimedia.org/wiki/File:Bottle_of_Water.jpg',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  {
    usedFor: 'Rosh (destaque)',
    title: 'Hookah and accessories',
    author: 'leelinesourcing',
    source: 'https://www.flickr.com/photos/201489506@N08/54003845920',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    usedFor: 'Acessórios',
    title: 'Hookah and accessories',
    author: 'leelinesourcing',
    source: 'https://www.flickr.com/photos/201489506@N08/54003749249',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    usedFor: 'Bebidas',
    title: 'Monster Energy',
    author: 'JeepersMedia',
    source: 'https://www.flickr.com/photos/39160147@N03/13100200773',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
]

export function CreditsPage() {
  return (
    <main className="customer-app">
      <section className="customer-panel credits-panel">
        <Link className="customer-back" to="/cliente"><ArrowLeft size={16} /> Voltar ao cardápio</Link>
        <h2>Créditos das imagens</h2>
        <p className="customer-muted">
          Algumas fotos do cardápio são de terceiros, usadas sob licenças Creative Commons.
          As imagens foram recortadas e redimensionadas. Marcas citadas pertencem aos seus donos.
        </p>
        <ul>
          {CREDITS.map((credit) => (
            <li key={credit.source}>
              <strong>{credit.usedFor}</strong>
              <span>
                “<a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.title}</a>”, por {credit.author} —{' '}
                <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}</a>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
