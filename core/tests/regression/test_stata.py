from __future__ import annotations

import os

import pandas as pd
import pytest

import acts.core as acts


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# statsmodels' optimizer and Stata's converge to slightly different floating
# point results for the same MLE problem (different solvers, different
# stopping criteria) — matching to 6 decimal places is unrealistic across
# two independent implementations. rel=1e-4 still catches a genuinely wrong
# coefficient while tolerating that noise (observed drift was ~1.6e-6).
REL_TOLERANCE = 1e-4


def test__mlogit__modefm_before_covid():
    """
    Stata Output:

    ```
    Iteration 0:   log likelihood =  -849.6858
    Iteration 1:   log likelihood = -729.42918
    Iteration 2:   log likelihood = -727.30551
    Iteration 3:   log likelihood = -727.29632
    Iteration 4:   log likelihood = -727.29632

    Multinomial logistic regression                 Number of obs     =        844
                                                    LR chi2(20)       =     244.78
                                                    Prob > chi2       =     0.0000
    Log likelihood = -727.29632                     Pseudo R2         =     0.1440

    ------------------------------------------------------------------------------
          MODEFM |      Coef.   Std. Err.      z    P>|z|     [95% Conf. Interval]
    -------------+----------------------------------------------------------------
    0            |  (base outcome)
    -------------+----------------------------------------------------------------
    1            |
          DESTFM |  -.5678328   .1839878    -3.09   0.002    -.9284423   -.2072233
             ACT |   1.349006   .2813884     4.79   0.000     .7974954    1.900518
         TRVFREQ |  -.5460018   .2851728    -1.91   0.056     -1.10493    .0129266
            AGEB |  -.4365621   .2765337    -1.58   0.114    -.9785583     .105434
            MEMB |  -.6534751   .2279635    -2.87   0.004    -1.100275    -.206675
           OVEHB |  -.2852347   .6129348    -0.47   0.642    -1.486565    .9160955
           NVEHB |   .2864681    .614091     0.47   0.641    -.9171281    1.490064
           OCCUB |   .4196622   .2208874     1.90   0.057    -.0132691    .8525935
        MINCOMEB |   .2728296   .2115975     1.29   0.197    -.1418939    .6875531
      TRAVTIMEFM |   1.483625   .2421026     6.13   0.000     1.009113    1.958138
           _cons |  -1.018713    .409909    -2.49   0.013     -1.82212   -.2153062
    -------------+----------------------------------------------------------------
    2            |
          DESTFM |  -.2994565   .1779877    -1.68   0.092     -.648306    .0493931
             ACT |   1.643744   .2769683     5.93   0.000     1.100896    2.186592
         TRVFREQ |   -.831982   .2781637    -2.99   0.003    -1.377173   -.2867912
            AGEB |  -.4027275   .2647515    -1.52   0.128    -.9216309    .1161759
            MEMB |  -.6644236   .2179116    -3.05   0.002    -1.091522   -.2373247
           OVEHB |    .340734   .5558579     0.61   0.540    -.7487274    1.430195
           NVEHB |   .3911247   .5548141     0.70   0.481    -.6962909     1.47854
           OCCUB |   .6621793   .2197823     3.01   0.003     .2314139    1.092945
        MINCOMEB |    .240418   .2031729     1.18   0.237    -.1577935    .6386295
      TRAVTIMEFM |    1.67231     .23244     7.19   0.000     1.216735    2.127884
           _cons |  -1.747128   .4097088    -4.26   0.000    -2.550143   -.9441135
    ------------------------------------------------------------------------------
    ```
    """
    df = pd.read_excel(os.path.join(
        CURRENT_DIR, "test_data_before_covid.xlsx"
    ))

    mlogit = acts.model.MLogit(
        df,
        "MODEFM",
        "DESTFM",
        "ACT",
        "TRVFREQ",
        "AGEB",
        "MEMB",
        "OVEHB",
        "NVEHB",
        "OCCUB",
        "MINCOMEB",
        "TRAVTIMEFM",
    )

    if __name__ == "__main__":
        print(mlogit.summary())

    assert mlogit.params.loc["const", 0] == pytest.approx(-1.018713, rel=REL_TOLERANCE)
    assert mlogit.params.loc["const", 1] == pytest.approx(-1.747128, rel=REL_TOLERANCE)

    assert mlogit.llr == pytest.approx(244.78, rel=REL_TOLERANCE)
    assert mlogit.llf == pytest.approx(-727.29632, rel=REL_TOLERANCE)


def test__mlogit__modefm_during_covid():
    """
    Stata Output:

    ```
    Iteration 0:   log likelihood =  -817.5679
    Iteration 1:   log likelihood = -577.04819
    Iteration 2:   log likelihood = -558.77363
    Iteration 3:   log likelihood = -558.26578
    Iteration 4:   log likelihood = -558.26544
    Iteration 5:   log likelihood = -558.26544

    Multinomial logistic regression                 Number of obs     =        805
                                                    LR chi2(32)       =     518.60
                                                    Prob > chi2       =     0.0000
    Log likelihood = -558.26544                     Pseudo R2         =     0.3172

    ------------------------------------------------------------------------------
          MODEFM |      Coef.   Std. Err.      z    P>|z|     [95% Conf. Interval]
    -------------+----------------------------------------------------------------
    0            |  (base outcome)
    -------------+----------------------------------------------------------------
    1            |
          DESTFM |  -.2682583   .1798086    -1.49   0.136    -.6206768    .0841601
             ACT |   1.449254   .3464501     4.18   0.000     .7702241    2.128284
             GEN |  -.3602694   .5637327    -0.64   0.523    -1.465165    .7446263
             POS |   .0908091   .5871219     0.15   0.877    -1.059929    1.241547
            AGED |  -.7425024   .2817059    -2.64   0.008    -1.294636   -.1903688
            MEMD |  -.3599891   .2465604    -1.46   0.144    -.8432385    .1232604
        NSENIORD |  -.0475506   .2502303    -0.19   0.849    -.5379929    .4428917
           OVEHD |  -1.250667   1.075692    -1.16   0.245    -3.358984      .85765
           NVEHD |   .8731122   1.079445     0.81   0.419    -1.242561    2.988785
          YEARSD |   .6983217   .2419259     2.89   0.004     .2241556    1.172488
           OCCUD |   .5712431   .3458043     1.65   0.099    -.1065209    1.249007
         OSETUPD |  -.0325459   .1316438    -0.25   0.805    -.2905629    .2254712
        MINCOMED |   .9834648    .237717     4.14   0.000     .5175481    1.449382
         TRVFREQ |  -.8337985   .2951281    -2.83   0.005    -1.412239   -.2553581
            TIME |   .0903715   .2661795     0.34   0.734    -.4313306    .6120736
      TRAVTIMEFM |   1.395476   .2683011     5.20   0.000      .869616    1.921337
           _cons |  -1.982683   .4631837    -4.28   0.000    -2.890507    -1.07486
    -------------+----------------------------------------------------------------
    2            |
          DESTFM |   .2247663    .248377     0.90   0.365    -.2620437    .7115763
             ACT |   2.696138   .4195401     6.43   0.000     1.873854    3.518421
             GEN |   1.163274   .4785148     2.43   0.015     .2254026    2.101146
             POS |  -.3653988   .4946327    -0.74   0.460    -1.334861    .6040636
            AGED |  -.4821575   .3079838    -1.57   0.117    -1.085795    .1214796
            MEMD |  -.1088328   .2814217    -0.39   0.699    -.6604092    .4427436
        NSENIORD |  -.3798603   .2835716    -1.34   0.180    -.9356503    .1759298
           OVEHD |  -.8533287   1.154655    -0.74   0.460    -3.116411    1.409754
           NVEHD |   3.335624   1.162985     2.87   0.004     1.056216    5.615033
          YEARSD |  -.1163069    .247375    -0.47   0.638     -.601153    .3685392
           OCCUD |    1.71766   .4377226     3.92   0.000      .859739     2.57558
         OSETUPD |  -.3940447   .1491868    -2.64   0.008    -.6864454    -.101644
        MINCOMED |   .1406993   .2509845     0.56   0.575    -.3512213    .6326199
         TRVFREQ |  -.7574539   .3202312    -2.37   0.018    -1.385095   -.1298124
            TIME |   1.238176   .2656082     4.66   0.000     .7175937    1.758759
      TRAVTIMEFM |   1.559757   .2915103     5.35   0.000     .9884077    2.131107
           _cons |  -4.818632   .6381128    -7.55   0.000     -6.06931   -3.567954
    ------------------------------------------------------------------------------
    ```
    """
    df = pd.read_excel(os.path.join(
        CURRENT_DIR, "test_data_during_covid.xlsx"
    ))

    mlogit = acts.model.MLogit(
        df,
        "MODEFM",
        "DESTFM",
        "ACT",
        "GEN",
        "POS",
        "AGED",
        "MEMD",
        "NSENIORD",
        "OVEHD",
        "NVEHD",
        "YEARSD",
        "OCCUD",
        "OSETUPD",
        "MINCOMED",
        "TRVFREQ",
        "TIME",
        "TRAVTIMEFM",
    )

    if __name__ == "__main__":
        print(mlogit.summary())

    assert mlogit.params.loc["const", 0] == pytest.approx(-1.982683, rel=REL_TOLERANCE)
    assert mlogit.params.loc["const", 1] == pytest.approx(-4.818632, rel=REL_TOLERANCE)

    assert mlogit.llr == pytest.approx(518.60, rel=REL_TOLERANCE)
    assert mlogit.llf == pytest.approx(-558.26544, rel=REL_TOLERANCE)


def test__mlogit__modelm_case_from_joy():
    """
    Stata Output:

    ```
    Iteration 0:   log likelihood = -840.04296
    Iteration 1:   log likelihood = -682.01209
    Iteration 2:   log likelihood = -669.96653
    Iteration 3:   log likelihood = -669.65854
    Iteration 4:   log likelihood = -669.65801
    Iteration 5:   log likelihood = -669.65801

    Multinomial logistic regression                 Number of obs     =        805
                                                    LR chi2(10)       =     340.77
                                                    Prob > chi2       =     0.0000
    Log likelihood = -669.65801                     Pseudo R2         =     0.2028

    ------------------------------------------------------------------------------
          MODELM |      Coef.   Std. Err.      z    P>|z|     [95% Conf. Interval]
    -------------+----------------------------------------------------------------
    0            |  (base outcome)
    -------------+----------------------------------------------------------------
    1            |
            AGED |  -.6395021   .2309769    -2.77   0.006    -1.092208   -.1867957
           NVEHD |  -.2327123   .2058844    -1.13   0.258    -.6362384    .1708137
           OCCUD |   .5601192   .2223011     2.52   0.012      .124417    .9958215
        MINCOMED |    .856284   .2003598     4.27   0.000     .4635859    1.248982
      TRAVTIMELM |   .5161023   .2683928     1.92   0.054    -.0099379    1.042143
           _cons |  -1.470767    .216374    -6.80   0.000    -1.894852   -1.046682
    -------------+----------------------------------------------------------------
    2            |
            AGED |  -.9118748   .2704267    -3.37   0.001    -1.441901   -.3818483
           NVEHD |   2.438647   .2349456    10.38   0.000     1.978162    2.899132
           OCCUD |   1.476556   .3221828     4.58   0.000     .8450897    2.108023
        MINCOMED |   .5617117   .2200731     2.55   0.011     .1303763    .9930471
      TRAVTIMELM |   1.416771   .2701048     5.25   0.000     .8873752    1.946167
           _cons |  -3.647872   .3617911   -10.08   0.000     -4.35697   -2.938775
    ------------------------------------------------------------------------------

    ```
    """
    df = pd.read_excel(os.path.join(
        CURRENT_DIR, "test_data_during_covid.xlsx"
    ))

    mlogit = acts.model.MLogit(
        df,
        "MODELM",
        "AGED",
        "NVEHD",
        "OCCUD",
        "MINCOMED",
        "TRAVTIMELM",
    )

    if __name__ == "__main__":
        print(mlogit.summary())

    assert mlogit.params.loc["const", 0] == pytest.approx(-1.470767, rel=REL_TOLERANCE)
    assert mlogit.params.loc["const", 1] == pytest.approx(-3.647872, rel=REL_TOLERANCE)

    assert mlogit.llr == pytest.approx(340.77, rel=REL_TOLERANCE)
    assert mlogit.llf == pytest.approx(-669.65801, rel=REL_TOLERANCE)


if __name__ == "__main__":
    test__mlogit__modefm_before_covid()
    test__mlogit__modefm_during_covid()
    test__mlogit__modelm_case_from_joy()
