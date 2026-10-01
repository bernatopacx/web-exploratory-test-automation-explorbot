# Evidence Index

Son okunabilir kanit paketi, GitHub Actions workflow run #14 artifact'inin icindeki `artifacts/evidence` klasorudur.

- Workflow: https://github.com/bernatopacx/web-exploratory-test-automation/actions/runs/36019490974
- Artifact ID: `10815698869`
- Test sonucu: 13 passed
- UI kaniti: 12 screenshot ve 12 MP4

`generated-case inventory` testi sadece dosya kontrolu yaptigi icin screenshot veya video uretmez. Bu nedenle 13 test sonucuna karsilik 12 UI evidence ciftinin olmasi beklenen durumdur.

Evidence klasorundeki dosya isimleri test case adiyla baslar. Her case icin:

- `.png`: testin son yakalanan ekran goruntusu
- `.mp4`: testin ekran kaydi

Ham `playwright-report/data` dosyalari rapor altyapisinin internal asset'leridir; incelemeye `artifacts/evidence` klasorunden baslanmalidir.
