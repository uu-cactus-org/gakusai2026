# 素材の出どころ

各ゲームの Unity のプロジェクトから写したものです。ゲーム側を直したら、ここも写し直します。

## WaterShooting

| ここ                                  | Unity 側                                        |
| ------------------------------------- | ----------------------------------------------- |
| `water-shooting/bg_stage*_back.png`   | `Assets/Sprites/Backgrounds/`                   |
| `water-shooting/bg_stage*_middle.png` | `Assets/Sprites/Backgrounds/`                   |
| `water-shooting/player_*.png`         | `Assets/Resources/PlayerSprites/player_*_0.png` |
| `fonts/PixelMplus12-Regular.ttf`      | `Assets/Fonts/PixelMplus/`                      |
| `fonts/Jersey10-Regular.ttf`          | `Assets/Fonts/Jersey10/`                        |

## UU-JUMP

[uu-cactus-org/2025-team3-jump-game](https://github.com/uu-cactus-org/2025-team3-jump-game) から写しました。
どちらもチームが描いた絵です。アセットストアの素材(Pixel Adventure 1 など)は、再配布の条件を確かめていないので使っていません。

| ここ                              | Unity 側                                                   |
| --------------------------------- | ---------------------------------------------------------- |
| `uu-jump/menu_bg.png`             | `Assets/Sprites/menu_bg.png`(タイトル画面の絵)             |
| `uu-jump/cactakun_charge.png`     | `Assets/Sprites/cactakun_charge.png`(主人公、4 コマ)       |
| `fonts/DotGothic16-Regular.woff2` | `Assets/Fonts/DotGothic16-Regular.ttf` を WOFF2 にしたもの |

## 書体のライセンス

- PixelMplus: M+ FONT LICENSE
- Jersey 10: SIL Open Font License 1.1
- DotGothic16: SIL Open Font License 1.1

Unity 側にライセンスの文面が置かれていなかったので、ここにも入れていません。リポジトリを公開する場合は、
配布元からライセンスの文面を取ってきて、書体と同じ場所に置いてください。

## 書体の大きさ

`PixelMplus12-Regular.ttf` は約 1.2 MB あります。日本語の全文字が入っているためです。回線が細い会場では、
使う文字だけに絞る(サブセットにする)と軽くなります。
