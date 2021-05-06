import { BehaviorSubject, combineLatest, EMPTY, forkJoin, from, fromEvent, interval, merge, of, pipe, ReplaySubject, Subject, zip } from 'rxjs'
import { fromFetch } from 'rxjs/fetch';
import { combineAll, debounce, distinctUntilChanged, filter, map, mapTo, mergeAll, mergeMap, mergeScan, pluck, scan, share, shareReplay, startWith, switchMap, take, takeLast, takeUntil, tap, toArray, withLatestFrom } from 'rxjs/operators'
import noise from '../public/noise.gif'
import btnSound from '../public/sounds/PokedexButtonFX.mp3'

const endPointApi = 'https://pokeapi.co/api/v2/'

const rightPad = document.querySelector('#rightcross');
const leftPad = document.querySelector('#leftcross');
const downPad = document.querySelector('#botcross');
const upPad = document.querySelector('#topcross');
const secondaryDisplayLeft = document.querySelector('#yellowBox1')
const secondaryDisplayRight = document.querySelector('#yellowBox2')
const pokedexDisplay: any = document.querySelector('#picture img')
const pokedexConsole = document.querySelector('#console');
const typesLayout = document.querySelectorAll('.type');
const statsLayout = document.querySelectorAll('.stat')
const secondaryStatsLayout = document.querySelectorAll('.secondaryStat')



let pokemonListEl = document.createElement('ul');
pokedexConsole.appendChild(pokemonListEl);

const pokemonDOMList$ = new BehaviorSubject([]);
const endPointGetPokemon$ = new BehaviorSubject(`${endPointApi}pokemon/`);
const currentPokemonSelected = new Subject();


interface StatsResult {
  base_stat: number,
  effort: number,
  stat: {
    name: string,
    url: string
  }
}

interface typeResult {
  slot: number,
  type: {
    name: string,
    url: string
  }
}

const displayChangeSideEffect = () => {
  if (pokedexDisplay.src !== noise) {
    pokedexDisplay.src = noise;
  }
  typesLayout.forEach(typeLayout => typeLayout.classList.add('hidden'));
  statsLayout.forEach(typeLayout => typeLayout.classList.add('hidden'));
  secondaryDisplayLeft.classList.add('loading');
  secondaryDisplayRight.classList.add('loading');
}

const renderListedPokemon = (pokemons) => {
  const newPokemonsOnDOMList = [];
  for (let pokemon of pokemons) {
    const listedPokemonEl = document.createElement('li')
    if (pokemon.name.length > 17) {
      listedPokemonEl.textContent = `${pokemon.name.toUpperCase().replaceAll('-', ' ').slice(0, 17)}...`;
    } else {
      listedPokemonEl.textContent = pokemon.name.toUpperCase().replaceAll('-', ' ');
    }

    listedPokemonEl.setAttribute('class', 'pokemonListed')
    pokemonListEl.appendChild(listedPokemonEl);
    newPokemonsOnDOMList.push(listedPokemonEl)
  }
  pokemonDOMList$.next([...pokemonDOMList$.value, ...newPokemonsOnDOMList])
}

const setPokedexDisplay = (img) => {
  pokedexDisplay.src = img;
}

const pokemonFetchStream$ = endPointGetPokemon$.pipe(
  switchMap(endPointGetPokemon =>
    fromFetch(endPointGetPokemon).pipe(
      switchMap(res =>
        from(res.json()),
      )
    )
  ), share()
)

const pokemonListStream$ = combineLatest([pokemonFetchStream$]).pipe(
  map(([pokemonFetchResult]) => pokemonFetchResult),
  pluck('results'),
  tap((x: any) => pokemonList$.next([...pokemonList$.value, ...x])),
)

pokemonListStream$.subscribe(renderListedPokemon)

interface PokemonListed {
  url: string,
  selected: boolean,
  name: string
}

const pokemonSelectedStream$ = currentPokemonSelected.pipe(
  filter(x => x instanceof Object),
  switchMap((x: PokemonListed) =>
    fromFetch(x.url).pipe(
      switchMap(res =>
        from(res.json()),
      )
    )
  ), share()
)

pokemonSelectedStream$.pipe(
  pluck('sprites'),
  pluck('front_default')
).subscribe(setPokedexDisplay)

const setPokemonDisplayStats = (stats: Array<StatsResult>) => {
  let i = 0;
  for (let statResult of stats) {
    secondaryDisplayLeft.classList.remove('loading')
    statsLayout[i].classList.remove('hidden');
    let [name, base] = statsLayout[i].children;
    let progress: any = base.firstElementChild.firstElementChild;
    let serializedName = statResult.stat.name.split('-').length > 1 ? statResult.stat.name.split('-').map(str => str.slice(0, 3).toUpperCase()).join('-') : statResult.stat.name.toUpperCase()
    name.textContent = serializedName;
    progress.style.width = `${statResult.base_stat / 150 * 100}%`;
    i++;
  }
}

pokemonSelectedStream$.pipe(
  pluck('stats'),
).subscribe(setPokemonDisplayStats)

const pokemonSpeciesStream$ = pokemonSelectedStream$.pipe(
  pluck('species'),
  pluck('url'),
  switchMap((url: string) =>
    fromFetch(url).pipe(
      switchMap((res) =>
        from(res.json()).pipe(
          map(({ shape: { name: shape }, habitat: { name: habitat }, capture_rate, base_happiness: happiness }) => ({ shape, habitat, capture_rate, happiness })),
          //map(next => )
        )
      )
    )
  )
)

const pokemonSecondaryStats$ = pokemonSelectedStream$.pipe(
  map(({ height, weight }) => ({ height, weight }))
)
const mergePokemonSecondaryStats = (acc, curr) => {
  for (let key of Object.keys(curr)) {
    acc[key] = curr[key];
  }
  return acc;
}

interface secondaryStatsResult {
  height: number,
  weight: number,
  shape: string,
  habitat: string,
  capture_rate: string,
  base_hapiness: number
}

const setPokemonDisplaySecondaryStats = (secondaryStats: Array<secondaryStatsResult>) => {
  let i = 0;
  for (let key of Object.keys(secondaryStats)) {
    secondaryDisplayRight.classList.remove('loading')
    secondaryStatsLayout[i].classList.remove('hidden');
    let [name, base] = secondaryStatsLayout[i].children;
    name.textContent = key.toUpperCase().replace('_', ' ');
    base.textContent = secondaryStats[key].length + key.length > 14 ? `${secondaryStats[key].toString().toUpperCase().replaceAll('-', ' ').slice(0, (12 - key.length))}...` : secondaryStats[key].toString().toUpperCase().replace('-', ' ');
    i++;
  }
}

combineLatest([pokemonSecondaryStats$, pokemonSpeciesStream$]).pipe(
  map(([pokemonSecondaryStats, pokemonSpeciesStream]) => mergePokemonSecondaryStats(pokemonSecondaryStats, pokemonSpeciesStream)),
).subscribe(setPokemonDisplaySecondaryStats)

const setPokemonTypes = (types: Array<typeResult>) => {
  if (types.length === 1) {
    typesLayout[types[0].slot].classList.remove('hidden');
    return typesLayout[types[0].slot].textContent = types[0].type.name.toUpperCase();
  }
  for (let typeResult of types) {
    typesLayout[typeResult.slot - 1].classList.remove('hidden');
    typesLayout[typeResult.slot - 1].textContent = typeResult.type.name.toUpperCase();
  }
}
/**
 * whos that pokemon?
 * img{
 * filter: brightness(0);
 * }
 *     
 */



const currentPokemonTypes$ = pokemonSelectedStream$.pipe(
  pluck('types'),
)

currentPokemonTypes$.subscribe(setPokemonTypes)

const typeDetailStream$ = currentPokemonTypes$.pipe(
  switchMap((types: any) =>
    forkJoin(
      types.map(type =>
        of(type).pipe(
          pluck('type'),
          pluck('url'),
          switchMap((url) =>
            fromFetch(url).pipe(
              switchMap(res =>
                from(res.json())
              )
            )
          )
        )
      )
    )
  )
)

const mergeDamageRelations = (acc, curr) => {
  for (let key of Object.keys(curr)) {
    if (acc[key] && acc[key].length) {
      acc[key].push(...curr[key].filter(x => !acc[key].map(y => y.name).includes(x.name)))
    } else {
      acc[key] = []
      acc[key].push(...curr[key])
    }
  }
  return acc;
}

const damageRelations = new BehaviorSubject([]);

typeDetailStream$.pipe(
  switchMap((detailType: any) =>
    forkJoin(
      detailType.map(type =>
        of(type).pipe(
          pluck('damage_relations'),
        )
      )
    )
  )
).subscribe((dr: any) => damageRelations.next(dr))

damageRelations.pipe(
  switchMap((damageRelation) =>
    from(damageRelation).pipe(
      scan((acc: any, curr: any) =>
        mergeDamageRelations(acc, curr), {}
      ), takeLast(1))
  )
).subscribe()


const downPadPress$ = fromEvent(downPad, 'mousedown').pipe(
  switchMap(() =>
    interval(100).pipe(
      mapTo(1),
      takeUntil(fromEvent(downPad, 'mouseup'))
    )
  )
)

const upPadPress$ = fromEvent(upPad, 'mousedown').pipe(
  switchMap(() =>
    interval(100).pipe(
      mapTo(-1),
      takeUntil(fromEvent(upPad, 'mouseup'))
    )
  )
)

const downPadClick$ = fromEvent(downPad, 'click')
  .pipe(
    mapTo(1)
  )
const upPadClick$ = fromEvent(upPad, 'click')
  .pipe(
    mapTo(-1)
  )

const pokemonList$ = new BehaviorSubject([]);

const scrollConsole = (value: number) => {
  const listItemHeight = document.querySelector('.pokemonListed')?.clientHeight;
  const desiredPosition = pokedexConsole.clientHeight / 3
  const scrollMove = value * listItemHeight
  const calculatedDesiredPosition = desiredPosition + (scrollMove / desiredPosition)
  if (scrollMove - calculatedDesiredPosition > 0)
    pokedexConsole.scroll(0, scrollMove - desiredPosition)
}

const cleanSelectedPokemons = (lastSelectedPokemons: Array<Element>) => {
  lastSelectedPokemons.forEach(x => x?.classList?.remove('selected'))
}

const pokemonSelectedIndex$ = new BehaviorSubject(0);

combineLatest([pokemonDOMList$, pokemonSelectedIndex$]).pipe(
  filter(x => x !== undefined),
  tap(([pokemonsOnDOM]) => cleanSelectedPokemons(pokemonsOnDOM.filter(x => x.classList.contains('selected')))),
  map(([pokemonsOnDOM, pokemonSelectedIndex]) => pokemonsOnDOM[pokemonSelectedIndex]),
).subscribe(pokemonListedDOM => pokemonListedDOM?.classList.add('selected'))

const clickOnListedPokemon$ = combineLatest([pokemonDOMList$]).pipe(
  map(([PokemonDOMList]) => PokemonDOMList),
  switchMap((pokemonOnDOM: any) =>
    fromEvent(pokemonOnDOM, 'click').pipe(
      map((x: Event) => x.target),
      map((x: Element) => pokemonOnDOM.findIndex((p: Element) => p.textContent === x.textContent)),
      withLatestFrom(pokemonSelectedIndex$),
      map(x => x[0] - x[1])
    ))
)

const selectPokemon$ = merge(downPadClick$, upPadClick$, downPadPress$, upPadPress$, clickOnListedPokemon$).pipe(
  tap(() => new Audio(btnSound).play()),
  startWith(0),
  scan((acc, curr) => acc + curr >= 0 ? curr + acc : acc, 0),
  distinctUntilChanged(),
  tap(displayChangeSideEffect),
  share()
).subscribe((i) => pokemonSelectedIndex$.next(i))

pokemonSelectedIndex$.subscribe(scrollConsole)

combineLatest([pokemonList$,pokemonSelectedIndex$]).pipe(
  map(([pokemons,i]) => currentPokemonSelected.next(pokemons[i])),
).subscribe()

const onConsoleScroll = () => {
  const winScroll = pokedexConsole.scrollTop;
  const height = pokedexConsole.scrollHeight - pokedexConsole.clientHeight;
  return ((winScroll / height) * 100 >= 95);
}

const scrollEvent$ = fromEvent(pokedexConsole, 'scroll').pipe(
  map(onConsoleScroll),
  startWith(false),
  distinctUntilChanged(),
  filter(x => x)
)

combineLatest([scrollEvent$]).pipe(
  withLatestFrom(pokemonFetchStream$),
  map(([_, pokemonFetch]) => pokemonFetch),
  pluck('next'),
).subscribe((url: string) => endPointGetPokemon$.next(url))

/*

const mergeDamageRelations = (acc,curr) => {
  for(let key of Object.keys(curr)){
    if(acc[key] && acc[key].length){
      acc[key].push(curr[key].filter(x=> !acc[key].includes(x.name)))
    }else{
      acc[key] = []
      acc[key].push(curr[key])
    }
  }
  return acc;
}

typeDetailStream$.pipe(
  switchMap((detailType: any) =>
    forkJoin(
      detailType.map(type =>
        of(type).pipe(
          tap(console.log),
          pluck('damage_relations'),
          mergeMap(damageRelations =>
            of(damageRelations).pipe(
              mergeScan((acc: any, curr: any) =>
                of(curr).pipe(
                  tap(() => console.log(acc,curr)),
                  map(curr => mergeDamageRelations(acc,curr))
                ), {}
              )
            )
          )
        )
      )
    )
  )
).subscribe(console.log)




*/


