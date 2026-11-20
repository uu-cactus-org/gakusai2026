import { Cactakun } from '#/features/uu-jump/cactakun';
import medium from '#/assets/water-shooting/player_medium.png';
import slim from '#/assets/water-shooting/player_slim.png';

// 段の地の色。2 位、1 位、3 位の順
const STEPS = [
  { rank: 2, className: 'left-0 h-[5.5rem] bg-[#6cc3ff]' },
  { rank: 1, className: 'left-[4.25rem] h-[8.25rem] bg-[#ffe079]' },
  { rank: 3, className: 'left-[8.5rem] h-16 bg-[#ff6a91]' },
];

/**
 * 表彰台と、その上に立つ 2 つのゲームのキャラ。OGP の画像と同じ並び。飾りなので、読み上げからは外す。
 *
 * キャラの位置は、絵の透明な余白を除いた体の中心を段の中央に、足を段の上面に合わせている。
 * 絵を差し替えたら、位置も合わせ直す。
 *
 * 大きさと位置は rem で書く(1rem = 16px のときの px を 16 で割った値)。広い画面で html の文字サイズを
 * 大きくしたとき、ほかと一緒に伸びるようにするため。
 */
export function Podium() {
  return (
    <div className="relative mx-7 h-[12.25rem] w-[12.75rem] shrink-0" aria-hidden="true">
      {STEPS.map(({ rank, className }) => (
        <div
          key={rank}
          className={`absolute bottom-0 w-[4.25rem] border-4 border-b-0 border-[#121f33] pt-1 text-center font-display text-[3.25rem] leading-none text-[#121f33] ${className}`}
        >
          <span className="absolute inset-x-0 top-0 h-2 bg-white/45" />
          {rank}
        </div>
      ))}
      {/* 1 位は UU-JUMP のサボテン(1rem = 16px のとき、1 ドットを 2px) */}
      <Cactakun className="absolute bottom-32 left-[4.3125rem] size-16" />
      {/* 2 位と 3 位は WaterShooting のプレイヤー(同じく 1 ドットを 3px)。3 位は、水の噴射が 1 位の段に重ならないよう左右を返す */}
      <img
        src={medium}
        alt=""
        className="pixelated absolute bottom-[4.1875rem] left-[-1.625rem] size-[5.625rem] max-w-none"
      />
      <img
        src={slim}
        alt=""
        className="pixelated absolute bottom-[3.0625rem] left-[8.75rem] size-[5.625rem] max-w-none -scale-x-100"
      />
    </div>
  );
}
